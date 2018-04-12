let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 1. 插入daily_yyyyMM表，得到dailyId
 * 2. 创建daily_events的关系
 *    - 在创建关系的loop中，
 *        1. update events表，isDeleted = 0
 *        2. 汇总当天汇报实际工时的总和
 *    - 用得到的总和去更新statistics表的realTime
 *        1. 根据传入的date找到时间范围， 和传入的userId
 * 
 */
async function createDaily(req, res, next) {
  let userId = req.id;
  let date = req.body.date || '';
  let content = req.body.content || '';
  let detail = req.body.detail || null;

  if (date.length <= 0 || content.length <= 0 || detail === null) {
    return next(new ResponseError('非法的参数/缺少参数', 406));
  }

  let thisMonth = new Date().format('yyyyMM');
  let dailyDate = new Date(`${date} 18:00:00`);
  let dailyDateStr = dailyDate.format('yyyy-MM-dd hh:mm:ss');

  try {
    let connection = createConnection();
    connection.connect();

    //  插入daily表
    let dailyId = (await query.sql(connection,
      `INSERT INTO daily_${thisMonth} (userId, content, date) 
      VALUES (${userId}, '${content}', '${dailyDateStr}')`)).insertId;

    let sum = 0;
    for (let eventId in detail) {
      eventId = +eventId;
      let dailyRealTime = +detail[eventId];

      //  创建daily_event关系
      await query.sql(connection, 
        `INSERT INTO daily_events_${thisMonth} (dailyId, eventId, userId, dailyRealTime, date) 
        VALUES (${dailyId}, ${eventId}, ${userId}, ${dailyRealTime}, '${dailyDateStr}')`);

      //  更新事件实际时间
      await query.sql(connection,
        `UPDATE events SET realTime = realTime + ${dailyRealTime} 
      WHERE id = ${eventId} AND isDeleted = 0`);

      sum += dailyRealTime;
    }

    //  更新statistics表
    let startTime = Date.getWeekStart(dailyDate).format('yyyy-MM-dd');
    let endTime = Date.getWeekEnd(dailyDate).format('yyyy-MM-dd');
    await query.sql(connection, `UPDATE statistics SET realTime = realTime + ${sum} WHERE
    userId = ${userId} AND (('${startTime}' BETWEEN startTime AND endTime) AND ('${endTime}' BETWEEN startTime AND endTime))`);

    connection.end();
    res.status(200).json({
      msg: '汇报成功',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = createDaily;