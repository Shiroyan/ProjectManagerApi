let mysql = require('mysql');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 获取用户资料
 */
async function getProfile(req, res, next) {
  try {
    let connection = createConnection();
    connection.connect();

    let rs = (await query.all(connection, 'users', 'id', req.id))[0];

    connection.end();
    res.status(200).json({
      id: rs.id,
      username: rs.username,
      city: rs.cityName,
      dep: rs.depName,
      job: rs.jobName,
      role: rs.roleId
    });
  } catch (err) {
    next(err);
  }
}


/**
 * 更新用户资料
 */
async function updateProfile(req, res, next) {
  let b = req.body;
  let username = b.username,
    cityId = +b.city,
    depId = +b.department,
    jobId = +b.job;

  //  校验参数类型、格式是否满足约束
  let error = validate(new Map([
    ['username', username],
    ['city', cityId],
    ['dep', depId],
    ['job', jobId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    let rs = await query.update(connection, 'users', {
      username,
      cityId,
      depId,
      jobId,
    }, 'id', req.id);

    connection.end();
    res.status(200).json({
      msg: '更新资料成功'
    });

  } catch (err) {
    next(err);
  }
}

async function updateProfileByAdmin(req, res, next) {
  let b = req.body;
  let userId = +req.params.uid,
    username = b.username,
    cityId = +b.city,
    depId = +b.department,
    jobId = +b.job,
    newPwd = b.newPwd;

  let params = [
    ['username', username],
    ['city', cityId],
    ['dep', depId],
    ['job', jobId]
  ];

  //  密码不为空则更新密码
  newPwd && params.push(['newPwd', newPwd]);

  //  校验参数类型、格式是否满足约束
  let error = validate(new Map(params));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    let data = { username, cityId, depId, jobId };
    newPwd && (data.password = newPwd);
    let rs = await query.update(connection, 'users', data, 'id', userId);

    connection.end();
    res.status(200).json({
      msg: '更新资料成功'
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfileByAdmin
};