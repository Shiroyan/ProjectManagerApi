let mysql = require('mysql');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 获取用户资料
 */
async function getProfile(req, res, next) {
  let connection;
  try {
    connection = createConnection();

    let rs = (await query.sql(connection,
      `SELECT id, username, cityId, cityName, depId, depName, jobId, jobName, roleId
      FROM users WHERE id = ${req.id} AND isDeleted = 0`))[0];

    let { id, username, cityId, cityName, depId, depName, jobId, jobName } = rs;
    let role = rs.roleId;
    res.status(200).json({
      userId: id,
      username, cityId, cityName, depId, depName, jobId, jobName, role,
      isAdmin: role === 0,
      isPM: role === 1 || role === 0,
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();    
  }
}


/**
 * 更新用户资料
 */
async function updateProfile(req, res, next) {
  let b = req.body;
  let username = b.username,
    cityId = +b.city,
    depId = +b.dep,
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

  let connection;
  try {
    connection = createConnection();
    
    let rs = await query.update(connection, 'users', {
      username,
      cityId,
      depId,
      jobId,
    }, 'id', req.id);

    res.status(200).json({
      msg: '更新资料成功'
    });

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

async function updateProfileByAdmin(req, res, next) {
  let b = req.body;
  let userId = +req.params.uid,
    username = b.username,
    cityId = +b.city,
    depId = +b.dep,
    jobId = +b.job,
    roleId = +b.role,
    newPwd = b.newPwd;

  let params = [
    ['username', username],
    ['city', cityId],
    ['dep', depId],
    ['job', jobId],
    ['role', roleId]
  ];

  //  密码不为空则更新密码
  newPwd && params.push(['newPwd', newPwd]);

  //  校验参数类型、格式是否满足约束
  let error = validate(new Map(params));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();
    
    let data = { username, cityId, depId, jobId };

    let sql = `UPDATE users SET
    username = '${username}', cityId = ${cityId}, depId = ${depId}, jobId = ${jobId}, roleId = ${roleId}`;
    if (newPwd) {
      sql += `, password = PASSWORD('${newPwd}')`;
    }
    sql += ` WHERE id = ${userId} AND isDeleted = 0`
    let rs = await query.sql(connection, sql);

    if (rs.affectedRows === 0) {
      return next(new ResponseError(406, '该用户不存在/已被删除'));
    }

    res.status(200).json({
      msg: '更新资料成功'
    });

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfileByAdmin
};