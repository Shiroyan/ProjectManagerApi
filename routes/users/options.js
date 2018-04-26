let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getOptions(req, res, next) {
  let connection;
  try {
    connection = createConnection({
      multipleStatements: true
    });

    let sqls = [
      'select id, name from departments',
      'select id, name from jobs',
      'select id, name from citys',
      'select id, name from roles'
    ];
    let rs = await query.multi(connection, sqls);

    let deps = rs[0],
      jobs = rs[1],
      citys = rs[2];
    roles = rs[3];

    res.status(200).json({
      deps,
      jobs,
      citys,
      roles
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getOptions;