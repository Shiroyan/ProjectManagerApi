let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function _deleteEvent(eventId, connection) {
  try {
    let error = validate(new Map([
      ['eventId', eventId]
    ]));
    if (error) {
      throw error;
    }
    //#region 更新statistics表
    let old = (await query.all(connection, 'events', 'id', eventId))[0];
    if (old) {
      let members = JSON.parse(old.members);
      if (Array.isArray(members) && members.length > 0) {
        members = members.map(m => m.id);
        let sql = `update statistics set
   planTime = planTime - ${old.planTime},
   realTime = realTime - ${old.realTime},
   approval = approval - ${old.approval}
   where userId in (${members.join(',')})
   and ('${old.startTime.format('yyyy-MM-dd')}' between startTime and endTime and '${old.endTime.format('yyyy-MM-dd')}' between startTime and endTime)`;
        await query.sql(connection, sql);
      }
    }
    //#endregion

    //  删除event
    await query.sql(connection,
      `UPDATE events SET isDeleted = 1 WHERE id = ${eventId}`);
    return new Promise((resolve, reject) => resolve());
  } catch (err) {
    return new Promise((resolve, reject) => reject(err));
  }
}

async function deleteEvent(req, res, next) {
  let eventId = +req.params.eventId;

  try {
    let connection = createConnection();
    connection.connect();

    await _deleteEvent(eventId, connection);

    connection.end();
    res.status(200).json({
      msg: '删除成功'
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  deleteEvent,
  _deleteEvent,
};