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

  let connection;
  try {
    connection = createConnection();

    let project = (await query.sql(connection,
      `SELECT id, name, leaderIds, memberIds, startTime, endTime, firstParty, contract, contractVal, stageId, stageName, process
      FROM projects WHERE id = ${projectId} AND isDeleted = 0`))[0];
    if (!project) {
      return next(new ResponseError('该项目不存在/已删除', 406));
    }


    //  查询参与成员的详细信息
    let { memberIds, leaderIds } = project;
    let members = [];
    let leaders = [];
    if (memberIds.length > 0) {
      members = await query.sql(connection,
        `SELECT id, username, cityId, cityName, depId, depName, jobId, jobName FROM users WHERE id IN (${memberIds})`);
    }
    if (leaderIds.length > 0) {
      leaders = await query.sql(connection,
        `SELECT id, username, cityId, cityName, depId, depName, jobId, jobName FROM users WHERE id IN (${leaderIds})`);
    }

    //  生成合同下载url
    let contract = `/projects/contracts/${project.id}`;

    let { id, name, startTime, endTime, firstParty, contractVal, stageId, stageName, process } = project;

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
      leaders,
      members,
      contract
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = getProjectsDetail;