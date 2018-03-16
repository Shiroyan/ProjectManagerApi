let config = require('../config');
let mysql = require('mysql');



function connect(options = {}) {
  let baseOptions = {
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPwd,
    database: config.dbName,
  };

  Object.assign(baseOptions, options);
  let connection = mysql.createConnection(baseOptions);

  return connection;
}
module.exports = connect;