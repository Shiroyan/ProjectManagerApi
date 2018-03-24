let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getStages(req, res, next) {
  try {
    let connection = createConnection();
    connection.connect();
    let sql = 'select id, name from stages';
    let rs = await query.sql(connection, sql);

    let stages = rs;
    
    connection.end();
    res.status(200).json(stages);
  } catch (err) {
    next(err);
  }
}

module.exports = getStages;