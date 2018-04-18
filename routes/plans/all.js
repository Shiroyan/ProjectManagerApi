let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getAllPlans(req, res, next) {
  let projecId = +req.query.projectId;

  let error = validate(new Map([
    ['projectId', projecId]
  ]));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();
    

    let plans = await query.sql(connection,
      `SELECT id, name, process FROM plans WHERE belongTo = ${projecId} AND isDeleted = 0`);
    let data = [];
    let events;
    for (let i = 0; i < plans.length; i++) {
      let plan = plans[i];
      let { id, name, process } = plan;
      let temp = { id, name, process, events: [] };
      events = await query.sql(connection,
        `SELECT id, \`desc\`, startTime, endTime, planTime, realTime, approval, ratio, process, isFinished, finishAt 
        FROM events WHERE belongTo = ${id} AND isDeleted = 0`);
      for (let event of events) {
        event.members = await query.sql(connection,
          `SELECT userId AS id, username, jobId FROM users_events WHERE eventId = ${event.id}`);
        event.tags = await query.sql(connection,
          `SELECT tagId AS id, tagName AS name FROM events_tags WHERE eventId = ${event.id}`);
        event.startTime = event.startTime.format('yyyy-MM-dd hh:mm:ss');
        event.endTime = event.endTime.format('yyyy-MM-dd hh:mm:ss');
        event.finishAt && (event.finishAt = event.finishAt.format('yyyy-MM-dd hh:mm:ss'));
        event.isFinished = !!event.isFinished;
        temp.events.push(event);
      }
      data.push(temp);
    }

    res.status(200).json(data);

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getAllPlans;