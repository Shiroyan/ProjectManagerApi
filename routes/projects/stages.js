let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getStages(req, res, next) {
  try {
    let connection = createConnection();
    connection.connect();
    let sql = 'SELECT id, name, `desc`, status FROM stages';
    let rs = await query.sql(connection, sql);

    connection.end();
    res.status(200).json(rs);
  } catch (err) {
    next(err);
  }
}

module.exports = getStages;