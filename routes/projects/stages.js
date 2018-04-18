let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getStages(req, res, next) {
  let connection;
  try {
    connection = createConnection();
    
    let sql = 'SELECT id, name, `desc`, status FROM stages';
    let rs = await query.sql(connection, sql);

    res.status(200).json(rs);
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getStages;