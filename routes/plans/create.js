let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function createPlan(req, res, next) {

  let b = req.body;
  let projectId = +b.projectId;
  let process = +b.process || 0;
  let { name } = b;
  name = name.transfer();
  
  let error = validate(new Map([
    ['projectId', projectId],
    ['process', process],
    ['planName', name]
  ]));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();
    

    await query.insert(connection, 'plans', {
      name,
      process,
      belongTo: projectId     //  计划归属于该项目
    });

    res.status(201).json({
      msg: '创建成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = createPlan;