let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getProjectsAbstract(req, res, next) {
  //  type - 请求数据类型 
  //  0-全部  1-进行中 2-立项中 3-已结项
  //  若不带有参数则默认为0
  let type = +req.query.type || 0;

  try {
    let connection = createConnection();
    connection.connect();

    //  筛选出该用户参与的所有项目的id
    //  根据项目id， 查询出相应阶段的项目
 
    let sql = `SELECT id, name, startTime, endTime, members, leaderName, stageName, process 
    FROM projects WHERE id in (SELECT projectId FROM users_projects WHERE userId = ${req.id})
    AND isDeleted = 0 `;

    let conds;
    //  关于stageId
    //  0、1    属于立项中
    //  2 - 10  属于进行中
    //  11      属于已结项
    switch (type) {
      case 1:
        conds = 'and stageId between 1 and 10'
        break;
      case 2:
        conds = 'and (stageId = 0 or stageId = 1)';
        break;
      case 3:
        conds = 'and stageId = 11'
        break;
      default:
        conds = '';
    }
    sql += conds;

    rs = await query.sql(connection, sql);
    let projects = [];
    rs.forEach(temp => {
      let { id, name, startTime, endTime, members, leaderName, stageName, process } = temp;
      projects.push({
        id,
        name,
        startTime: startTime.format('yyyy-MM-dd'),
        endTime: endTime.format('yyyy-MM-dd'),
        process,
        stage: stageName,
        leader: leaderName,
        members
      });
    });
    connection.end();
    res.status(200).json(projects);

  } catch (err) {
    return next(err);
  }
}

module.exports = getProjectsAbstract;