let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
let { isTableExist } = require('../vertify');


/**
 *  1. 找出旧数据（事件未被删除的）
 *  2. 更新events表（未被删除的）
 *  3. 更新statistics表（该时段）
 */
async function deleteDaily(req, res, next) {
  let userId = +req.id;
  let dailyId = +req.params.did;
  let date = req.body.date || '';

  if (date.length <= 0) {
    return next(new ResponseError('非法的参数/缺少参数', 406));
  }
  let error = validate(new Map([
    ['eventId', dailyId]
  ]));
  if (error) {
    return next(error);
  }

  let dailyDate = new Date(`${date} 18:00:00`);
  let dailyMonth = new Date(date);
  let dailyMonthStr = dailyMonth.format('yyyyMM');

  try {
    let connection = createConnection();
    connection.connect();

    //  检查table是否存在
    let isExist = await isTableExist(connection, `daily_events_${dailyMonthStr}`);

    if (!isExist) {
      return next(new ResponseError('该月份日报表不存在', 500));
    }

    let dailyEvents = await query.sql(connection,
      `SELECT dailyRealTime, eventId FROM daily_events_${dailyMonthStr} WHERE 
      dailyId = ${dailyId} AND userId = ${userId}`);

    let sum = 0;
    for (let { eventId, dailyRealTime } of dailyEvents) {
      //  更新未删除的事件
      let affectedRows = (await query.sql(connection, 
        `UPDATE events SET realTime = realTime - ${dailyRealTime} WHERE 
        id = ${eventId} AND isDeleted = 0`)).affectedRows;
      if (affectedRows > 0) {
        sum += dailyRealTime;
      }

      await query.sql(connection, 
        `DELETE FROM daily_events_${dailyMonthStr} 
        WHERE eventId = ${eventId} AND dailyId = ${dailyId}`);
    }
    //  删除daily_yyyyMM
    await query.sql(connection,
      `DELETE FROM daily_${dailyMonthStr} WHERE dailyId = ${dailyId} AND userId = ${userId}`);

    //  更新statistics表
    let startTime = Date.getWeekStart(dailyDate).format('yyyy-MM-dd');
    let endTime = Date.getWeekEnd(dailyDate).format('yyyy-MM-dd');
    await query.sql(connection, `UPDATE statistics SET realTime = realTime - ${sum} WHERE
    userId = ${userId} AND (('${startTime}' BETWEEN startTime AND endTime) AND ('${endTime}' BETWEEN startTime AND endTime))`);

    connection.end();

    res.status(200).json({
      msg: '删除成功',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = deleteDaily;