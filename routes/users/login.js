let jwt = require('jsonwebtoken');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let config = require('../../config');
let validate = require('../../utils/validate');



const SECRECT = config.secrect;


/**
 * 登录，获取用户信息
 * 普通的账号密码登录
 */
async function login(req, res, next) {

  let ac = req.body.account,
    pwd = req.body.password,
    autoLogin = req.body.autoLogin;

  //  校验参数类型、格式是否满足约束
  let error = validate(new Map([
    ['account', ac],
    ['password', pwd]
  ]));
  if (error) {
    return next(error);
  }

  let connection = createConnection();

  connection.connect();
  let rs;

  try {
    rs = await query.all(connection, 'users', 'account', ac);
    rs = rs[0];
    connection.end();

    //  账号不存在
    if (!rs) {
      return next(new ResponseError('账号不存在', 406));
    }

    //  密码错误
    if (rs.password != pwd) {
      return next(new ResponseError('密码错误', 406));
    }
  } catch (err) {
    next(err);
  }

  let token = jwt.sign({
    id: rs.id
  }, SECRECT);

  let day = autoLogin === 'false' ? 0.1 : 15;
  res.cookie('token', token, {
    expires: new Date(Date.now() + day * 24 * 3600 * 1000),
    httpOnly: true,
  });
  let { username, cityId, cityName, depId, depName, jobId, jobName } = rs;
  let role = rs.roleId;
  res.status(200).json({
    msg: '登陆成功',
    userId: rs.id,
    username, cityId, cityName, depId, depName, jobId, jobName, role
  });
}


module.exports = login;