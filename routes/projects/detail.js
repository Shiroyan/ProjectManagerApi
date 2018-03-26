let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getProjectsDetail(req, res, next) {
  let projectId = +req.params.projectId;
  //  校验参数projectId是否合法
  let error = validate(new Map([
    ['projectId', projectId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    let project = (await query.sql(connection, 
      `SELECT id, name, leaderId, startTime, endTime, firstParty, contract, contractVal, stageId, stageName, process
      FROM projects WHERE id = ${projectId} AND isDeleted = 0`))[0];
    if (!project) {
      return next(new ResponseError('该项目不存在/已删除', 406));
    }

    let { leaderId } = project;

    //  查询参与成员的详细信息
    let sql = `select * from users where id in (select userId from users_projects where projectId = ${projectId})`;
    rs = await query.sql(connection, sql);
    //  组织需要返回的数据
    let members = [];
    let leader;
    rs.forEach(({ id, username, cityId, cityName, depId, depName, jobId, jobName }) => {
      let temp = { id, username, cityId, cityName, depId, depName, jobId, jobName };
      id === leaderId ? (leader = temp) : members.push(temp);
    });
    //  生成合同下载url
    let contract = `/projects/contracts/${project.id}`;

    let { id, name, startTime, endTime, firstParty, contractVal, stageId, stageName, process } = project;

    connection.end();
    res.status(200).json({
      id,
      name,
      startTime: startTime.format('yyyy-MM-dd hh:mm:ss'),
      endTime: endTime.format('yyyy-MM-dd hh:mm:ss'),
      firstParty,
      contractVal: +contractVal,
      stageId,
      stageName,
      process,
      leader,
      members,
      contract
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = getProjectsDetail;