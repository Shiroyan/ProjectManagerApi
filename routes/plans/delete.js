let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
const { _deleteEvent } = require('../events/delete');

async function _deletePlan(projectId, planId, connection) {
  try {
    let error = validate(new Map([
      ['planId', planId],
      ['projectId', projectId]
    ]));
    if (error) {
      throw error;
    }

    //  查找该计划下的所有event
    let events = await query.sql(connection,
      `SELECT id FROM events WHERE belongTo = ${planId} AND isDeleted = 0`);
    for (let event of events) {
      let { id } = event;
      await _deleteEvent(id, connection);
    }

    await query.sql(connection,
      `UPDATE plans SET isDeleted = 1 WHERE id = ${planId} AND belongTo = ${projectId}`);
    return new Promise((resolve, reject) => {
      resolve();
    });
  } catch (err) {
    return new Promise((resolve, reject) => {
      reject(err);
    });
  }
}
async function deletePlan(req, res, next) {
  let planId = +req.params.planId;
  let projectId = +req.body.projectId;
  let connection;
  try {
    connection = createConnection();
    

    //  删除计划
    await _deletePlan(projectId, planId, connection);


    res.status(200).json({
      msg: '删除成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = {
  deletePlan,
  _deletePlan,
};