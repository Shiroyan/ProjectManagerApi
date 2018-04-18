let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getEvents(req, res, next) {
  let userId = +req.id;
  let date = req.query.date || new Date();

  date = new Date(date);
  date.setHours(12);
  date = date.format('yyyy-MM-dd hh:mm:ss');

  let error = validate(new Map([['userId', userId]]));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();

    let sql = `SELECT id, \`desc\` FROM events 
    WHERE id IN (SELECT eventId FROM users_events WHERE userId = ${userId}) 
    AND isDeleted = 0
    AND ('${date}' BETWEEN startTime AND endTime AND '${date}' BETWEEN startTime AND endTime)`;
    let events = await query.sql(connection, sql);

    res.status(200).json(events);
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getEvents;