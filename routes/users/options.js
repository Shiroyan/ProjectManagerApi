let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getOptions(req, res, next) {
  try {
    let connection = createConnection({
      multipleStatements: true
    });
    let rs = await query.multi(connection, [
      'select * from departments where id <> 0',
      'select * from jobs where id <> 0',
      'select * from citys',
    ]);

    let deps = rs[0],
      jobs = rs[1],
      citys = rs[2];
    
    res.status(200).json({
      deps,
      jobs,
      citys
    });
  } catch (err) {
    next(err);
  }
}

module.exports = getOptions;