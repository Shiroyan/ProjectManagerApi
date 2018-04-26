let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');


async function updateEvaluation(req, res, next) {
  let date = req.body.date || new Date();
  let detail = req.body.detail || '[]';

  detail = JSON.parse(detail);
  date = Date.getFirstMonday(new Date(date));
  let dateStr = date.format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();

    for (let { id, name, ratio } of detail) {
      await query.sql(connection,
        `UPDATE evaluation SET ratio = ${ratio} WHERE projectId = ${id} 
        AND date = '${dateStr}'`);
    }

    res.status(200).json({
      msg: '修改评价成功',
    });
  } catch (err) {
    next(err);
  } finally {
    connection.end();
  }
}

module.exports = {
  updateEvaluation
}