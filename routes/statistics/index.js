let router = require('express').Router();
let schedule = require('node-schedule');
let query = require('../../utils/query');
let createConnection = require('../../utils/create-connection');

let getPlanReport = require('./plan');
let getRealReport = require('./real');
let genExcel = require('./excel');

schedule.scheduleJob('0 0 0 * * 1', async function () {
  console.log('开始执行批量更新 <统计表> 脚本');
  try {
    let connection = createConnection();
    connection.connect();

    let rs = await query.sql(connection, `select id from users where isDeleted = 0`);
    let startTime = Date.getWeekStart().format('yyyy-MM-dd');
    let endTime = Date.getWeekEnd().format('yyyy-MM-dd');

    let data = rs.map(temp => `(${temp.id}, '${startTime}', '${endTime}')`);
    await query.sql(connection, `insert into statistics (userId, startTime, endTime) values ${data.join(' , ')}`);

    connection.end();
    console.log('结束脚本');
  } catch (err) {
    console.error('脚本异常: ', err);
  }
});

//  系统、成员的变动
async function stateChange(req, res, next) {
  let startTime = req.query.startTime || Date.getWeekStart().format('yyyy-MM-dd');
  let endTime = req.query.endTime || Date.getWeekEnd().format('yyyy-MM-dd');

  //#region 检验日期是否在同一周、相差是否超过7天
  let error = Date.inAWeek(startTime, endTime);
  if (error) {
    return next(error);
  }
  //#endregion

  try {
    let connection = createConnection({
      multipleStatements: true
    });
    connection.connect();

    let rs = await query.multi(connection, [
      `select username from users where createAt between '${startTime}' and '${endTime}'`,
      `select username from users where deletedAt between '${startTime}' and '${endTime}'`,
      `select name from projects where createAt between '${startTime}' and '${endTime}'`,
      `select name from projects where deletedAt between '${startTime}' and '${endTime}'`
    ]);
    let newMembers, newProjects, delMembers, delProjects;
    //#region 查找日期内的新增成员
    newMembers = rs[0];
    newMembers = newMembers.map(temp => temp.username);
    //#endregion

    //#region 查找日期内删除的成员
    delMembers = rs[1];
    delMembers = delMembers.map(temp => temp.username);
    //#endregion

    //#region 查找日期内创建的项目
    newProjects = rs[2];
    newProjects = newProjects.map(temp => temp.name);
    //#endregion

    //#region 查找日期内删除的项目
    delProjects = rs[3];
    delProjects = delProjects.map(temp => temp.name);
    //#endregion

    res.status(200).json({
      newMembers,
      delMembers,
      newProjects,
      delProjects
    });
  } catch (err) {
    return next(err);
  }
}

router.get('/', stateChange);
router.get('/excel/plan', genExcel);
router.post('/excel/real', genExcel);
router.get('/:userId/plan', getPlanReport);
router.get('/:userId/real', getRealReport);

module.exports = router;