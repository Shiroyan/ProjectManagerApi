let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
let { isTableExist } = require('../vertify');


/**
 *  1. 在更新之前需要查找旧的数据（该用户、该日期，事件未被删除的）
 *  2. 对比新旧数据的单向偏差值，总和偏差值
 *  3. 事件有可能已经被删除了？ 
 *      - 在编辑的时候会拉取未被删除的事件，所以不必担心修改已删除的事件，事件必然都是存在的
 *  4. 旧数据中包含了已被删除的事件？
 *      - 所以在筛选旧数据的时候需要过滤掉已删除的事件，避免总偏差值出现错乱
 *  5. 日报的日期不得更改
 *  6. 根据偏差值去update events表（未被删除）
 *  7. 根据总偏差值去update statistics表（该用户，传入时间的时段）
 */

async function updateDaily(req, res, next) {
  let userId = +req.id;
  let dailyId = +req.body.dailyId;
  let content = req.body.content || '';
  let detail = req.body.detail || null;
  let date = req.body.date || '';

  if (date.length <= 0 || content.length <= 0 || detail === null) {
    return next(new ResponseError('非法的参数/缺少参数', 406));
  }

  let error = validate(new Map([
    ['eventId', dailyId]
  ]));
  if (error) {
    return next(error);
  }


  detail = JSON.parse(detail);
  content = content.split('\n').map(val => `<p>${val}</p>`);

  let dailyMonth = new Date(date);
  let dailyMonthStr = dailyMonth.format('yyyyMM');
  let dailyDate = new Date(`${date} 18:00:00`);
  let dailyDateStr = dailyDate.format('yyyy-MM-dd hh:mm:ss');
  let dailyTitle = `<h2>${dailyDate.format('dd日')}</h2>`;
  content.unshift(dailyTitle);
  content = content.join(' ');

  let connection;
  try {
    connection = createConnection();

    //  检查table是否存在
    let isExist = await isTableExist(connection, `daily_${dailyMonthStr}`);

    if (!isExist) {
      return next(new ResponseError('该月份日报表不存在', 500));
    }

    let sumOffset = 0;
    for (let eventId in detail) {
      //#region  查找旧数据，计算偏差值      
      let rs = await query.sql(connection,
        `SELECT dailyRealTime FROM daily_events_${dailyMonthStr} 
        WHERE dailyId = ${dailyId} AND userId = ${userId} AND eventId = ${eventId}`);

      let oDailyRealTime = 0;
      if (rs) {
        oDailyRealTime = +rs[0].dailyRealTime;
      } else {
        return next(new ResponseError('缺少其中一项的旧数据, 无法更新，请尝试刷新页面获取最新数据', 406));
      }

      nDailyRealTime = +detail[eventId];
      let offset = nDailyRealTime - oDailyRealTime;
      //#endregion

      //  更新events表
      let affectedRows = (await query.sql(connection,
        `UPDATE events SET realTime = realTime + ${offset} WHERE id = ${eventId} AND isDeleted = 0`)).affectedRows;

      if (affectedRows > 0) {
        sumOffset += offset;

        //  更新daily_events_yyyyMM表
        await query.sql(connection,
          `UPDATE daily_events_${dailyMonthStr} SET dailyRealTime = ${nDailyRealTime} 
           WHERE dailyId = ${dailyId} AND eventId = ${eventId} AND userId = ${userId}`);
      }
    }

    //  更新statistics表
    let startTime = Date.getWeekStart(dailyDate).format('yyyy-MM-dd');
    let endTime = Date.getWeekEnd(dailyDate).format('yyyy-MM-dd');
    await query.sql(connection, `UPDATE statistics SET realTime = realTime + ${sumOffset} WHERE
    userId = ${userId} AND (('${startTime}' BETWEEN startTime AND endTime) AND ('${endTime}' BETWEEN startTime AND endTime))`);

    //  更新daily_yyyyMM表
    await query.sql(connection,
      `UPDATE daily_${dailyMonthStr} SET content = '${content}' WHERE dailyId = ${dailyId}`);

    res.status(200).json({
      msg: '更新成功'
    });

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = updateDaily;