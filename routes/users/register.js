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

  let account = b.account,
    password = b.password,
    username = b.username,
    cityId = +b.city,
    depId = +b.dep,
    jobId = +b.job,
    roleId = +b.job === 5 ? 1 : 2;

  let connection;
  try {
    connection = createConnection({
      multipleStatements: true,
    });

    // 确认是否为重复的account
    let rs = await query.all(connection, 'users', 'account', account);
    if (rs.length !== 0) {
      return next(new ResponseError('账号已存在', 406));
    }

    password = (await query.sql(connection, `SELECT PASSWORD('${password}')`))[0][`PASSWORD('${password}')`];

    //  写入数据库
    let sql = `INSERT INTO users SET username = '${username}', password = '${password}',
    account = '${account}', cityId = ${cityId}, depId = ${depId}, jobId = ${jobId}, roleId = ${roleId}`;
    rs = await query.sql(connection, sql);

    //#region 创建用户同时也要更新statistics表
    let userId = rs.insertId;

    let nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    let startTime = Date.getWeekStart().format('yyyy-MM-dd hh:mm:ss');
    let endTime = Date.getWeekEnd().format('yyyy-MM-dd hh:mm:ss');
    let nWStartTime = Date.getWeekStart(nextWeek).format('yyyy-MM-dd hh:mm:ss');
    let nWEndTime = Date.getWeekEnd(nextWeek).format('yyyy-MM-dd hh:mm:ss');
    await query.sql(connection,
      `INSERT INTO statistics (userId, startTime, endTime) VALUES (${userId},'${startTime}','${endTime}')`);
    await query.sql(connection,
      `INSERT INTO statistics (userId, startTime, endTime) VALUES (${userId},'${nWStartTime}','${nWEndTime}')`);
    //#endregion

    res.status(201).json({
      msg: '注册成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}



module.exports = register;