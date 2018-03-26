let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let config = require('../../config');



async function autoLogin(req, res, next) {
  try {
    let connection = createConnection();
    let sql = `SELECT id,username,password,cityId,cityName,depId,depName,jobId,jobName,roleId FROM users WHERE id = ${req.id} and isDeleted = 0`;
    
    let rs = (await query.sql(connection, sql))[0];

    connection.end();
    let { username, cityId, cityName, depId, depName, jobId, jobName } = rs;
    let role = rs.roleId;
    res.status(200).json({
      msg: '登陆成功',
      userId: req.id,
      username, cityId, cityName, depId, depName, jobId, jobName, role
    });
  } catch (err) {
    next(err);
  }
}


module.exports = autoLogin;