let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');


async function addEvaluation(req, res, next) {
  let date = req.body.date || new Date();
  let detail = req.body.detail || '[]';

  detail = JSON.parse(detail);
  date = Date.getFirstMonday(new Date(date));
  let dateStr = date.format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();

    let data = detail.map(({ id, name, ratio }) => `(${id}, '${name}', ${ratio}, '${dateStr}')`)
    await query.sql(connection,
      `INSERT INTO evaluation (projectId, projectName, ratio, date) VALUES ${data.join(',')}`);

    res.status(200).json({
      msg: '添加评价成功',
    });
  } catch (err) {
    next(err);
  } finally {
    connection.end();
  }
}

module.exports = {
  addEvaluation
}