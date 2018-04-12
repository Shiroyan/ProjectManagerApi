let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getEvents(req, res, next) {
  let userId = +req.id;
  let date = req.query.date || new Date();

  date = new Date(date).format('yyyy-MM-dd');

  let error = validate(new Map([['userId', userId]]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    let sql = `SELECT id, \`desc\` FROM events 
    WHERE id IN (SELECT eventId FROM users_events WHERE userId = ${userId}) 
    AND isDeleted = 0
    AND ('${date}' BETWEEN startTime AND endTime AND '${date}' BETWEEN startTime AND endTime)`;
    let events = await query.sql(connection, sql);

    res.status(200).json(events);
  } catch (err) {
    return next(err);
  }
}

module.exports = getEvents;