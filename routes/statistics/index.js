let router = require('express').Router();
let schedule = require('node-schedule');
let query = require('../../utils/query');
let createConnection = require('../../utils/create-connection');

let getPlanReport = require('./plan');
let getRealReport = require('./real');
let { genExcel, getDownloadUrl } = require('./excel');

/**
 * 每个星期一凌晨0：00 自动生成本星期，下星期的统计表
 */
schedule.scheduleJob('0 0 0 * * 1', async function () {
  console.log('开始执行批量更新 <统计表> 脚本');
  try {
    let connection = createConnection();
    connection.connect();
    let nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    let rs = await query.sql(connection, `select id from users where isDeleted = 0`);
    let startTime = Date.getWeekStart().format('yyyy-MM-dd hh:mm:ss');
    let endTime = Date.getWeekEnd().format('yyyy-MM-dd hh:mm:ss');
    let nWStartTime = Date.getWeekStart(nextWeek).format('yyyy-MM-dd hh:mm:ss');
    let nWEndTime = Date.getWeekEnd(nextWeek).format('yyyy-MM-dd hh:mm:ss');

    let data1 = rs.map(temp => `(${temp.id}, '${startTime}', '${endTime}')`);
    let data2 = rs.map(temp => `(${temp.id}, '${nWStartTime}', '${nWEndTime}')`);
    await query.sql(connection, `insert into statistics (userId, startTime, endTime) values ${data1.join(' , ')}`);
    await query.sql(connection, `insert into statistics (userId, startTime, endTime) values ${data2.join(' , ')}`);

    connection.end();
    console.log('结束脚本');
  } catch (err) {
    console.error('脚本异常: ', err);
  }
});

//  系统、成员的变动
async function stateChange(req, res, next) {
  let date = new Date();
  let startTime = req.query.startTime || date;
  let endTime = req.query.endTime || date;
  
  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd');
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
      startTime: new Date(startTime).format('yyyy-MM-dd'),
      endTime: new Date(endTime).format('yyyy-MM-dd'),
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
router.get('/excel', getDownloadUrl);
router.get('/excel/plan', genExcel);
router.get('/excel/real', genExcel);
router.get('/:userId/plan', getPlanReport);
router.get('/:userId/real', getRealReport);

module.exports = router;