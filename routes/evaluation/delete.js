let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');


async function deleteEvaluation(req, res, next) {
  let date = req.body.date || new Date();

  date = Date.getFirstMonday(new Date(date));
  let dateStr = date.format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();

    await query.sql(connection, 
      `DELETE FROM evaluation WHERE date = '${dateStr}'`);

    res.status(200).json({
      msg: '删除成功',
    });
  } catch (err) {
    next(err);
  } finally {
    connection.end();
  }
}

module.exports = {
  deleteEvaluation
}