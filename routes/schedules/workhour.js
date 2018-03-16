let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');



async function updateWorkHour(req, res, next) {
  let startTime = new Date(req.body.startTime).format('yyyy-MM-dd');
  let endTime = new Date(req.body.endTime).format('yyyy-MM-dd');
  let avaTime = req.body.avaTime;

  try {
    let connection = createConnection();
    connection.connect();

    let sql = `update statistics set avaTime = ${avaTime} where userId = ${req.id} and (startTime between '${startTime}' and '${endTime}' 
    or endTime between '${startTime}' and '${endTime}')`

    let rs = await query.sql(connection, sql);
    if (rs.affectedRows === 0) {
      return next(new ResponseError('不存在该时段的工时', 406));
    }

    connection.end();
    res.status(200).json({
      msg: '汇报成功'
    });

  } catch (err) {
    return next(err);
  }
}

async function updateWorkHourByPM(req, res, next) {
  let userId = +req.params.userId;
  let startTime = new Date(req.body.startTime).format('yyyy-MM-dd');
  let endTime = new Date(req.body.endTime).format('yyyy-MM-dd');
  let avaTime = req.body.avaTime;

  let error = validate(new Map([
    ['uid', userId]
  ]));
  if (error) {
    return next(error);
  }
  try {
    let connection = createConnection();
    connection.connect();

    let sql = `update statistics set avaTime = ${avaTime} where userId = ${userId} and (startTime between '${startTime}' and '${endTime}' 
    or endTime between '${startTime}' and '${endTime}')`

    let rs = await query.sql(connection, sql);
    if (rs.affectedRows === 0) {
      return next(new ResponseError('不存在该时段的工时', 406));
    }

    connection.end();
    res.status(200).json({
      msg: '汇报成功'
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  updateWorkHour,
  updateWorkHourByPM
};