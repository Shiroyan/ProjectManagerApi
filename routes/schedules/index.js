let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
let { isPM } = require('../vertify');
let { updateWorkHour, updateWorkHourByPM } = require('./workhour');

async function getSchedules(req, res, next) {
  let { year, month } = req.params;
  year = +year;
  month = +month;
  if (!year || !month) {
    return next(new ResponseError('缺少参数/参数非法', 406));
  }
  let begin = new Date(year, month - 1, 1);
  let end = new Date(year, month, 0, 23, 59, 59, 999);
  let beginStr = new Date(year, month - 1, 1).format('yyyy-MM-dd hh:mm:ss');
  let endStr = new Date(year, month, 0, 23, 59, 59, 999).format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();
    

    let sql = `SELECT id, \`desc\`, startTime, endTime, projectId, projectName 
    FROM events WHERE id IN (SELECT eventId FROM users_events WHERE userId = ${req.id}) AND isDeleted = 0 and isFinished = 0
    AND ((startTime >= '${beginStr}' AND startTime <= '${endStr}') OR (endTime >= '${beginStr}' AND endTime <= '${endStr}'))`;
    let rs = await query.sql(connection, sql);

    //  以日期为key
    let schedules = {};
    rs.forEach((temp) => {
      let { desc, startTime, endTime, projectId, projectName } = temp;
      let eventId = temp.id;
      if (startTime <= end || startTime >= begin) {
        let startDate = startTime.getDate();
        schedules[startDate] = schedules[startDate] || [];
        schedules[startDate].push({
          eventId,
          projectId,
          projectName,
          desc: desc.length > 5 ? `${desc.slice(0,5)}...` : `${desc}`,
          status: '开始',
        });
      }
      if (endTime <= end || endTime >= begin) {
        let endDate = endTime.getDate();
        schedules[endDate] = schedules[endDate] || [];
        schedules[endDate].push({
          eventId,
          projectId,
          projectName,
          desc: desc.length > 5 ? `${desc.slice(0,5)}...` : `${desc}`,
          status: '结束',
        });
      }
    });
    res.status(200).json(schedules);

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }

}
router.get('/:year/:month', getSchedules);
router.post('/workhour', updateWorkHour);
router.put('/workhour', [isPM, updateWorkHourByPM]);

module.exports = router;