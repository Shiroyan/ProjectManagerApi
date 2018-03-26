let mysql = require('mysql');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 注册，写入数据库
 */
async function register(req, res, next) {

  let b = req.body;

  //  校验参数类型、格式是否满足约束
  let error = validate(new Map([
    ['account', b.account],
    ['password', b.password],
    ['username', b.username],
    ['city', +b.city],
    ['dep', +b.dep],
    ['job', +b.job]
  ]));
  if (error) {
    return next(error);
  }

  let connection = createConnection({
    multipleStatements: true,
  });

  connection.connect();

  let account = b.account,
    password = b.password,
    username = b.username,
    cityId = +b.city,
    depId = +b.dep,
    jobId = +b.job,
    roleId = +b.job === 5 ? 1 : 2;

  try {
    // 确认是否为重复的account
    let rs = await query.all(connection, 'users', 'account', account);
    if (rs.length !== 0) {
      connection.end();
      return next(new ResponseError('账号已存在', 406));
    }

    password = (await query.sql(connection, `SELECT PASSWORD('${password}')`))[0][`PASSWORD('${password}')`];

    //  写入数据库
    let sql = `INSERT INTO users SET username = '${username}', password = '${password}',
    account = '${account}', cityId = ${cityId}, depId = ${depId}, jobId = ${jobId}, roleId = ${roleId}`;
    rs = await query.sql(connection, sql);

    connection.end();
    res.status(201).json({
      msg: '注册成功'
    });
  } catch (err) {
    next(err);
  }
}



module.exports = register;