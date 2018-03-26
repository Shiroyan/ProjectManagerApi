let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function finishEvent(req, res, next) {
  let eventId = +req.params.eventId;
  let isFinished = +req.body.isFinished;

  let error = validate(new Map([
    ['eventId', eventId],
    ['isFinished', isFinished]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();


    let rs = await query.sql(connection, `select eventId from users_events where userId = ${+req.id} and eventId = ${eventId}`);
    if (rs[0] || req.role === 1 || req.role === 0) {
      await query.sql(connection,
        `UPDATE events SET isFinished = ${isFinished} WHERE id = ${eventId} AND isDeleted = 0`);
    } else {
      return next(new ResponseError('没有权限/该事件已被删除', 403));
    }

    connection.end();

    res.status(200).json({
      msg: '更新状态成功'
    });
  
  } catch (err) {
    return next(err);
  }
}

module.exports = finishEvent;