let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 1. 前端传入的startTime endTime
 * 2. 根据这2个值 在 statistics表中查找此区间的可用工时
 * 3. 根据这2个值 在 events 中查找次区间的事件、计算它们的计划总时间， 
 *    各项目（包含多个事件）占比
 * 
 * ps.事件应该是以周为单位，切不可跨越2周，否则数据将会错误。如果2周计划都一模一样
 *    那么只好在下周继续进行创建！
 */

async function getPlanReport(req, res, next) {
  let userId = +req.params.userId;


  let error = validate(new Map([
    ['uid', userId]
  ]));
  if (error) {
    return next(error);
  }

  let date = new Date();
  let startTime = req.query.startTime || date;
  let endTime = req.query.endTime || date;

  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd');

  //#region 检验日期是否在同一周、相差是否超过7天
  error = Date.inAWeek(startTime, endTime);
  if (error) {
    return next(error);
  }
  //#endregion

  try {
    let connection = createConnection();
    connection.connect();

    //  查找给定时间的可用工时
    let sql = `select planTime, avaTime, busyTime from statistics 
    where userId = ${userId} 
    and ('${startTime}' between startTime and endTime
    and '${endTime}' between startTime and endTime)`

    let rs = (await query.sql(connection, sql))[0];
    let { avaTime, planTime, busyTime } = rs;


    //  查找用户参与的所有事件, 并找出它们参与的所有项目， 项目占用工时
    sql = `select projectId,projectName,planTime from events 
    where isDeleted = 0 AND
    id in (select eventId from users_events where userId = ${userId})
    and (startTime between '${startTime}' and '${endTime}' and endTime between '${startTime}' and '${endTime}')`;

    let events = await query.sql(connection, sql);
    let projects = new Map();
    events.forEach(event => {
      let { projectId, projectName, planTime } = event;
      let project = projects.get(projectId);
      if (project) {
        project.planTime += planTime;
      } else {
        projects.set(projectId, {
          planTime,
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

    connection.end();
    res.status(200).json({
      startTime,
      endTime,
      planTime,
      avaTime,
      busyTime,
      projects: temp
    });


  } catch (err) {
    return next(err);
  }
}


module.exports = getPlanReport;