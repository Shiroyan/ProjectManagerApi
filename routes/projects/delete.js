let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
const { _deletePlan } = require('../plans/delete');


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

    //  找出该项目下的所有plan, 并删除
    let plans = await query.sql(connection,
      `SELECT id FROM plans WHERE belongTo = ${projectId} AND isDeleted = 0`);
    for (let plan of plans) {
      let { id } = plan;
      await _deletePlan(projectId, id, connection);
    }

    //  删除项目
    await query.sql(connection,
      `UPDATE projects SET isDeleted = 1 , deletedAt = '${new Date().format('yyyy-MM-dd hh:mm:ss')}'
      WHERE id = ${projectId}`);

    connection.end();
    res.status(200).json({
      msg: '删除成功'
    });

  } catch (err) {
    next(err);
  }
}
module.exports = deleteProject;