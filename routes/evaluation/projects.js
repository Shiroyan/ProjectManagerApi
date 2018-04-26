let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 *  获取指定月份内所有项目id，name
 */
async function getProjects(req, res, next) {
  let month = req.query.date || new Date();

  month = new Date(month);
  let monthStart = Date.getFirstMonday(month);
  let nextMonthStart = Date.getFirstMonday(month.setMonth(month.getMonth() + 1));
  let monthStartStr = monthStart.format('yyyy-MM-dd hh:mm:ss');
  let nextMonthStartStr = nextMonthStart.format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();

    let rs = await query.sql(connection, 
      `SELECT id, name FROM projects WHERE isDeleted = 0 AND 
      '${monthStartStr}' BETWEEN startTime AND endTime OR 
      '${nextMonthStartStr}' BETWEEN startTime AND endTime`);

    res.status(200).json(rs);
  } catch(err) {
    next(err);
  } finally {
    connection.end();
  }
}

module.exports = {
  getProjects
}