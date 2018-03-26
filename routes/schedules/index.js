let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
let { isPM } = require('../vertify');
let { updateWorkHour, updateWorkHourByPM } = require('./workhour');

async function getSchedules(req, res, next) {
  let dateString = req.params.date;
  let [year, month] = dateString.split('-');
  let begin = new Date(year, month - 1, 1);
  let end = new Date(year, month, 0);

  try {
    let connection = createConnection();
    connection.connect();

    let sql = `select 
    id, \`desc\`, startTime, endTime, projectId, projectName 
    from events 
    where id in (select eventId from users_events where userId = ${req.id})
    and (startTime >= ${+begin} or endTime <= ${+end}) 
    and isDeleted = 0`;
    let rs = await query.sql(connection, sql);

    connection.end();
    console.log(rs);
    res.status(200).json({
      schedules: rs
    });

  } catch (err) {
    return next(err);
  }

}
router.get('/:date', getSchedules);
router.post('/workhour', updateWorkHour);
router.put('/workhour', [isPM, updateWorkHourByPM]);

module.exports = router;