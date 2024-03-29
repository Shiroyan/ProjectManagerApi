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


  connection.connect(function (err) {              // The server is either down
    if (err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(connect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
  // If you're also serving http, display a 503 error.
  connection.on('error', function (err) {
    console.log('db error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      connect();                                  // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
  return connection;
}
module.exports = connect;