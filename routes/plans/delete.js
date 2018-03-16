let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function deletePlan(req, res, next) {
  let planId = +req.params.planId;
  let projectId = +req.body.projectId;

  let error = validate(new Map([
    ['planId', planId],
    ['projectId', projectId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    await query.delete(connection, 'plans', 'id', planId);
    
    connection.end();

    res.status(200).json({
      msg: '删除成功'
    });
  } catch(err) {
    return next(err);
  }
}

module.exports = deletePlan;