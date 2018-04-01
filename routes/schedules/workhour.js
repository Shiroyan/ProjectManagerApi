let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');



async function updateWorkHour(req, res, next) {
  let date = new Date();
  let startTime = req.body.startTime || date;
  let endTime = req.body.endTime || date;

  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd');

  let avaTime = req.body.avaTime;

  try {
    let connection = createConnection();
    connection.connect();

    let sql = `UPDATE statistics SET avaTime = ${avaTime} 
    WHERE userId = ${req.id} 
    AND ('${startTime}' BETWEEN startTime AND endTime)
    AND ('${endTime}' BETWEEN startTime AND endTime)`;

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
  let avaTime = req.body.avaTime;
  let startTime = req.body.startTime || date;
  let endTime = req.body.endTime || date;
  let members = req.body.members.toArray();

  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd');


  if (members.length === 0) {
    return next(new ResponseError('请选择成员！', 406));
  }

  try {
    let connection = createConnection();
    connection.connect();


    let sql = `UPDATE statistics SET avaTime = ${avaTime} 
    WHERE userId IN (${members.join(',')}) 
    AND ('${startTime}' BETWEEN startTime AND endTime)
    AND ('${endTime}' BETWEEN startTime AND endTime)`;

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