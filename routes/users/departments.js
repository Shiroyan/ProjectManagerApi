let router = require('express').Router();
let mysql = require('mysql');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function divideUsersByDep(req, res, next) {
  try {
    let connection = createConnection({
      multipleStatements: true
    });
    //  从departments表中获取部门的id和name 并去除管理员一项
    let deps = await query.all(connection, 'departments');
    deps.shift();

    //  构造sql语句数组，进行分组筛选
    let sql = 'select * from users where depId = ?';
    let sqls = [];
    deps.forEach(dep => {
      sqls.push(mysql.format(sql, dep.id));
    });
    let groups = await query.multi(connection, sqls);

    let data = [];
    groups.forEach((group, index) => {
      let users = [];
      group.forEach(user => {
        users.push({
          id: user.id,
          username: user.username,
          dep: user.depName,
          city: user.cityName,
          job: user.jobName
        });
      });
      data.push({
        dep: deps[index].name,
        users
      });
    });
    connection.end();
    res.status(200).json(data);

  } catch (err) {
    next(err);
  }
}

async function divideUsersByJob(req, res, next) {
  let depId = req.params.depId;
  try {
    let connection = createConnection({
      multipleStatements: true
    });
    //  从jobs表中获取岗位的id和name, 并去除管理员一项
    let jobs = (await query.all(connection, 'jobs'));
    jobs.shift();

    //  构造sql语句数组，进行分组筛选
    let sql = 'select * from users where depId = ? and jobId = ? ';
    let sqls = [];
    jobs.forEach(job => {
      sqls.push(mysql.format(sql, [depId, job.id]));
    });
    let groups = await query.multi(connection, sqls);

    let data = [];
    groups.forEach((group, index) => {
      let users = [];
      group.forEach(user => {
        users.push({
          id: user.id,
          username: user.username,
          dep: user.depName,
          city: user.cityName,
          job: user.jobName
        });
      });
      data.push({
        job: jobs[index].name,
        users
      });
    });

    connection.end();
    res.status(200).json(data);

  } catch (err) {
    next(err);
  }
}


module.exports = {
  divideUsersByDep,
  divideUsersByJob
};