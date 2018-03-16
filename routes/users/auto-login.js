let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let config = require('../../config');



async function autoLogin(req, res, next) {
  console.log('autologin');
  try {
    let connection = createConnection();

    let rs = (await query.all(connection, 'users', 'id', req.id))[0];

    connection.end();
    res.status(200).json({
      msg: '登陆成功',
      data: {
        username: rs.username,
        city: rs.cityName,
        dep: rs.depName,
        job: rs.jobName,
        role: rs.roleId,
      }
    });
  } catch(err) {
    next(err);
  }
}


module.exports = autoLogin;