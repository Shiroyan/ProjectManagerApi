let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function updatePlan(req, res, next) {
  let projectId = +req.body.projectId;
  let planId = +req.params.planId;
  let process = +req.body.process;
  let { name } = req.body;

  let error = validate(new Map([
    ['projectId', projectId],
    ['planId', planId],
    ['process', process],
    ['planName', name]
  ]));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();
    

    //  避免planId与projectId对不上
    await query.update(connection, 'plans', {
      name,
      process
    }, 'id', planId);

    
    res.status(200).json({
      msg: '更新成功'
    });
  } catch(err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}
module.exports = updatePlan;