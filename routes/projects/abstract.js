let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');
const PAGE_COUNT = 9;

async function getProjectsAbstract(req, res, next) {
  //  type - 请求数据类型 
  //  0-全部  1-进行中 2-立项中 3-已结项
  //  若不带有参数则默认为0
  let type = +req.query.type || 0;
  let page = +req.query.page || 1;

  let connection;
  try {
    connection = createConnection();

    //  关于阶段状态
    //  status = 2    属于立项中
    //  status = 1    属于进行中
    //  status = 3    属于已结项
    let conds = '';
    if (type) {
      conds = `stageId IN (SELECT id FROM stages WHERE status = ${type})`;
    }
    let sortLimit = ` ORDER BY createAt DESC LIMIT ${(page - 1) * PAGE_COUNT}, ${page * PAGE_COUNT}`;

    //  筛选出该用户参与的所有项目的id
    //  根据项目id， 查询出相应阶段的项目

    let sql = `SELECT id, name, startTime, endTime, memberIds, leaderIds, stageName, process 
    FROM projects 
    WHERE id IN (SELECT projectId FROM users_projects WHERE userId = ${req.id})
    AND isDeleted = 0 AND ${conds}`;
    if (req.role === 0) {
      sql = `SELECT id, name, startTime, endTime, memberIds, leaderIds, stageName, process FROM projects WHERE isDeleted = 0 AND ${conds}`;
    }
    sql += sortLimit;

    //  查询行数，以计算页数
    let sql2 = `SELECT COUNT(id) FROM projects WHERE id IN (SELECT projectId FROM users_projects WHERE userId = ${req.id}) AND ${conds} AND isDeleted = 0`;
    if (req.role === 0) {
      sql2 = `SELECT COUNT(id) FROM projects WHERE ${conds} AND isDeleted = 0`;
    }


    let projectsCnt = (await query.sql(connection, sql2))[0]['COUNT(id)'];

    rs = await query.sql(connection, sql);

    //  组织返回的数据格式
    let projects = [];
    for (let temp of rs) {
      let { id, name, startTime, endTime, stageName, process, memberIds, leaderIds } = temp;
      let membersName = [], leadersName = [];
      //  查找leader、member的名字
      if (memberIds.length > 0) {
        membersName = await query.sql(connection,
          `SELECT username FROM users WHERE id IN (${memberIds})`);
      }
      if (leaderIds.length > 0) {
        leadersName = await query.sql(connection,
          `SELECT username FROM users WHERE id IN (${leaderIds})`);
      }

      let leaders = leadersName.map(u => u.username);
      let members = membersName.map(u => u.username);

      projects.push({
        id,
        name,
        startTime: startTime.format('yyyy-MM-dd'),
        endTime: endTime.format('yyyy-MM-dd'),
        process,
        stage: stageName,
        leaders,
        members
      });
    }

    res.status(200).json({
      total: projectsCnt,
      pageSize: PAGE_COUNT,
      pageCnt: Math.ceil(projectsCnt / PAGE_COUNT),
      projects
    });

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getProjectsAbstract;