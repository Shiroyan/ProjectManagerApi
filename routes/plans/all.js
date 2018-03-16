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

    let plans = await query.all(connection, 'plans', 'belongTo', projecId);
    let data = [];
    let events;
    for (let i = 0; i < plans.length; i++) {
      let plan = plans[i];
      let { id, name, process } = plan;
      let temp = { id, name, process, events: [] };
      events = await query.all(connection, 'events', 'belongTo', id);
      events.forEach(event => {
        delete event.belongTo;
        event.tags = JSON.parse(event.tags);
        event.members = JSON.parse(event.members);
        temp.events.push(event);
      })
      data.push(temp);
    }

    connection.end();
    res.status(200).json({
      plans: data
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = getAllPlans;