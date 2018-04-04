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
    let old = (await query.sql(connection,
      `SELECT startTime, endTime, planTime, realTime, approval 
    FROM events WHERE id = ${eventId}`))[0];
    if (old) {
      let members = await query.sql(connection,
        `SELECT userId AS id FROM users_events WHERE eventId = ${eventId}`);
      members = members.map(({ id }) => id);

      if (Array.isArray(members) && members.length > 0) {
        membersStr = members.join(',');
        let sql = `update statistics set
   planTime = planTime - ${old.planTime},
   realTime = realTime - ${old.realTime},
   approval = approval - ${old.approval}
   where userId in (${membersStr})
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