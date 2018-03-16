let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function createPlan(req, res, next) {

  let b = req.body;
  let projectId = +b.projectId;
  let process = +b.process || 0;
  let { name } = b;
  
  let error = validate(new Map([
    ['projectId', projectId],
    ['process', process],
    ['projectName', name]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    await query.insert(connection, 'plans', {
      name,
      process,
      belongTo: projectId     //  计划归属于该项目
    });

    connection.end();
    res.status(201).json({
      msg: '创建成功'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = createPlan;