let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
let { isTableExist } = require('../vertify');


//  按月份，按用户筛选日报
async function getDailyAbstract(req, res, next) {
  let dailyMonth = req.query.date || new Date();
  let userId = +req.query.uid;

  let error = validate(new Map([['userId', userId]]));
  if (error) {
    return next(error);
  }

  dailyMonth = new Date(dailyMonth);
  dailyMonthStr = dailyMonth.format('yyyyMM');

  let connection;
  try {
    connection = createConnection();

    //  检查table是否存在
    let isExist = await isTableExist(connection, `daily_${dailyMonthStr}`);

    if (!isExist) {
      res.status(200).json([]);
    } else {
      let data = [];
      let dailies = await query.sql(connection,
        `SELECT dailyId AS id, content, date FROM daily_${dailyMonthStr} WHERE userId = ${userId} ORDER BY date DESC`);

      for (let { id, content, date } of dailies) {
        content = content.split('\n').map(val => `<p>${val}</p>`);
        let dailyTitle = `<h2>${new Date(date).format('dd日')}</h2>`;
        content.unshift(dailyTitle);
        content = content.join(' ');
        data.push({
          id, content, date
        });
      }

      res.status(200).json(data);
    }
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

/**
 *  1. 找到对应月份的日报表
 *  2. 找到当天汇报的事件， 通过 daily_events关系表
 *  3. 过滤已被删除的事件
 */
async function getDailyDetail(req, res, next) {
  let userId = +req.id;
  let dailyId = +req.params.did;
  let dailyMonth = req.query.date || new Date();
  dailyMonth = new Date(dailyMonth);
  let dailyMonthStr = dailyMonth.format('yyyyMM');

  let error = validate(new Map([
    ['userId', userId],
    ['eventId', dailyId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    connection = createConnection();


    let isExist = await isTableExist(connection, `daily_${dailyMonthStr}`);

    if (!isExist) {
      res.status(200).json([]);
    } else {
      let daily = await query.sql(connection,
        `SELECT content FROM daily_${dailyMonthStr} WHERE userId = ${userId} AND dailyId = ${dailyId}`);

      if (daily.length === 0) {
        return next(new ResponseError('不存在该日报', 406));
      }
      let { content } = daily[0];
      // content = content.replace(/<[^>]+>/g, '');

      let dailyEvents = await query.sql(connection,
        `SELECT eventId, dailyRealTime FROM daily_events_${dailyMonthStr} WHERE dailyId = ${dailyId} AND userId = ${userId}`);

      let events = [];
      for (let { eventId, dailyRealTime } of dailyEvents) {
        let event = await query.sql(connection,
          `SELECT \`desc\`, projectName FROM events WHERE id = ${eventId} AND isDeleted = 0`);
        if (event.length > 0) {
          events.push({
            dailyRealTime,
            id: eventId,
            desc: event[0].desc,
            projectName: event[0].projectName
          });
        }
      }
      res.status(200).json({
        events,
        content,
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDailyAbstract,
  getDailyDetail
};