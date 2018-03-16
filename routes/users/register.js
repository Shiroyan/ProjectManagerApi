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

  let user = {
    account: b.account,
    password: b.password,
    username: b.username,
    cityId: +b.city,
    depId: +b.dep,
    jobId: +b.job,
    roleId: 2,
  };

  try {
    // 确认是否为重复的account
    let rs = await query.all(connection, 'users', 'account', user.account);
    if (rs.length !== 0) {
      connection.end();
      return next(new ResponseError('账号已存在', 406));
    }

    //  写入数据库
    rs = await query.insert(connection, 'users', user);
  } catch (err) {
    next(err);
  }

  connection.end();
  res.status(201).json({
    msg: '注册成功'
  });
}



module.exports = register;