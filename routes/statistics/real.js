let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 1. 前端传入的startTime endTime，只能为到上个星期星期日为止，因为最新数据只有上个星期的
 * 2. 根据这2个值 在 statistics表中查找此区间的可用工时
 * 3. 根据这2个值 在 events 中查找次区间的事件、计算它们的计划总时间， 各项目（包含多个事件）占比
 * 4. 在statistics表中查找上周的 效率、实际偏差
 * 5. 在statistics表中统计 忙闲持续周数、优差持续周数
 * ps.PM需要在事件结束后填写 核准、实际工时、系数、进程， 否则将没有数据
 */

const EXCELLENT = 1.2;
const BAD = 0.8;
const BUSY = 8;
const FREE = -8;

async function getRealReport(req, res, next) {
  let userId = +req.params.userId;
  let error = validate(new Map([
    ['userId', userId]
  ]));
  if (error) {
    return next(error);
  }

  let date = new Date();
  date.setDate(date.getDate() - 7); //  退回到上个星期
  let startTime = req.query.startTime || date;
  let endTime = req.query.endTime || date;

  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd hh:mm:ss');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd hh:mm:ss');

  //#region 检验日期是否在同一周、相差是否超过7天
  error = Date.inAWeek(startTime, endTime, 'real');
  if (error) {
    return next(error);
  }
  //#endregion


  try {
    let connection = createConnection();
    connection.connect();

    //#region 变量预定义
    let avaTime = 0,
      planTime = 0,
      realTime = 0,
      approval = 0,
      busyTime = 0,
      planOffset = 0,
      realOffset = 0,
      lastWeekRealOffset = 0,
      effect = 0,
      lastWeekEff = 0,
      badCnt = 0,
      busyCnt = 0;
    //#endregion    

    //#region 查找 可用工时/计划时间/忙闲时间/核准时间/效率/实际、计划偏差值
    let sql = `select avaTime,planTime,approval,busyTime,planOffset,realOffset,effect from statistics 
    where userId = ${userId} 
    and ('${startTime}' between startTime and endTime
    and '${endTime}' between startTime and endTime)`;

    let rs = (await query.sql(connection, sql))[0];
    if (rs) {
      avaTime = rs.avaTime;
      planTime = rs.planTime;
      approval = rs.approval;
      busyTime = rs.busyTime;
      planOffset = rs.planOffset;
      realOffset = rs.realOffset;
      effect = rs.effect
    } else {
      return next(new ResponseError('暂无数据', 406));
    }

    //#endregion

    //#region 查找用户参与的所有事件, 并找出它们参与的所有项目， 项目占用工时
    sql = `select projectId,projectName,planTime, realTime from events 
    where isDeleted = 0 AND
    id in (select eventId from users_events where userId = ${userId})
    and (startTime between '${startTime}' and '${endTime}' and endTime between '${startTime}' and '${endTime}')`;

    let events = await query.sql(connection, sql);
    let projects = new Map();
    events.forEach(event => {
      let { projectId, projectName, planTime, realTime } = event;
      let project = projects.get(projectId);
      if (project) {
        project.planTime += planTime;
        project.realTime += realTime;
      } else {
        projects.set(projectId, {
          planTime,
          realTime,
          name: projectName
        });
      }
    });

    let temp = [];
    for (let [id, info] of projects) {
      info.id = id;
      info.percentage = +(info.planTime / planTime).toFixed(2);
      temp.push(info);
    }
    //#endregion

    //#region 查找“上周” （相当于代码执行时的上上周）的 实际偏差值、效率。
    let date = new Date();
    date.setDate(date.getDate() - 14);
    let lStartTime = Date.getWeekStart(date).format('yyyy-MM-dd'),
      lEndTime = Date.getWeekEnd(date).format('yyyy-MM-dd');

    sql = `select realOffset, effect from statistics 
    where userId = ${userId} 
    and ('${lStartTime}' between startTime and endTime
    and '${lEndTime}' between startTime and endTime)`
    rs = (await query.sql(connection, sql))[0];
    if (rs) {
      lastWeekEff = rs.effect;
      lastWeekRealOffset = rs.realOffset;
    }
    //#endregion

    //#region 统计忙闲持续、优差持续
    sql = `select busyTime, effect from statistics where userId = ${userId}`;
    rs = await query.sql(connection, sql);
    let len = rs.length;
    for (let i = 0; i < len - 1; i++) {
      let lastWeek = rs[i],
        thisWeek = rs[i + 1];
      let lEff = lastWeek.effect,
        lBusyTime = lastWeek.busyTime,
        tEff = thisWeek.effect,
        tBusyTime = thisWeek.busyTime;

      if (lEff >= EXCELLENT && tEff >= EXCELLENT) {
        badCnt--;
      } else if (lEff <= BAD && tEff <= BAD) {
        badCnt++;
      } else {
        badCnt = 0;
      }

      if (lBusyTime >= BUSY && tBusyTime >= BUSY) {
        busyCnt++;
      } else if (lBusyTime <= FREE && tBusyTime <= FREE) {
        busyCnt--;
      } else {
        busyCnt = 0;
      }
    }

    //#endregion

    connection.end();
    res.status(200).json({
      startTime,
      endTime,
      planTime,
      avaTime,
      realTime,
      approval,
      busyTime,
      planOffset,
      realOffset,
      lastWeekRealOffset,
      effect,
      lastWeekEff,
      badCnt,
      busyCnt,
      projects: temp
    });


  } catch (err) {
    return next(err);
  }
}


module.exports = getRealReport;