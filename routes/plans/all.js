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

  try {
    let connection = createConnection();
    connection.connect();

    let plans = await query.sql(connection, 
      `SELECT id, name, process FROM plans WHERE belongTo = ${projecId} AND isDeleted = 0`);
    let data = [];
    let events;
    for (let i = 0; i < plans.length; i++) {
      let plan = plans[i];
      let { id, name, process } = plan;
      let temp = { id, name, process, events: [] };
      events = await query.sql(connection, 
        `SELECT id, \`desc\`, startTime, endTime, planTime, realTime, approval, ratio, process, tags, isFinished, members, finishAt 
        FROM events WHERE belongTo = ${id} AND isDeleted = 0`);
      events.forEach(event => {
        event.tags = JSON.parse(event.tags);
        event.members = JSON.parse(event.members);
        event.startTime = event.startTime.format('yyyy-MM-dd hh:mm:ss');
        event.endTime = event.endTime.format('yyyy-MM-dd hh:mm:ss');
        event.finishAt && (event.finishAt = event.finishAt.format('yyyy-MM-dd hh:mm:ss'));
        temp.events.push(event);
      })
      data.push(temp);
    }

    connection.end();
    res.status(200).json(data);

  } catch (err) {
    return next(err);
  }
}

module.exports = getAllPlans;