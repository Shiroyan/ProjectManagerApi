let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function deleteProject(req, res, next) {
  //  校验参数
  let projectId = +req.params.projectId;
  let error = validate(new Map([
    ['projectId', projectId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    await query.delete(connection, 'projects', 'id', projectId);

    connection.end();
    res.status(200).json({
      msg: '删除成功'
    });

  } catch (err) {
    next(err);
  }
}
module.exports = deleteProject;