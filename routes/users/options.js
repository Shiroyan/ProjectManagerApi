let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getOptions(req, res, next) {
  try {
    let connection = createConnection({
      multipleStatements: true
    });
    let rs = await query.multi(connection, [
      'select id, name from departments where id <> 0',
      'select id, name from jobs where id <> 0',
      'select id, name from citys',
      'select id, name from roles WHERE id <> 0'
    ]);

    let deps = rs[0],
      jobs = rs[1],
      citys = rs[2];
      roles = rs[3];

    connection.end();
    res.status(200).json({
      deps,
      jobs,
      citys,
      roles
    });
  } catch (err) {
    next(err);
  }
}

module.exports = getOptions;