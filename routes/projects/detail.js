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

    let project = (await query.all(connection, 'projects', 'id', projectId))[0];
    if (!project) {
      return next(new ResponseError('该项目不存在', 406));
    }

    let { leaderId } = project;

    //  查询参与成员的详细信息
    let sql = `select * from users where id in (select userId from users_projects where projectId = ${projectId})`;
    rs = await query.sql(connection, sql);
    //  组织需要返回的数据
    let members = [];
    let leader;
    rs.forEach(user => {
      let temp = {
        username: user.username,
        dep: user.depName,
        job: user.jobName,
        city: user.cityName
      };
      user.id === leaderId ? (leader = temp) : members.push(temp);
    });
    //  生成合同下载url
    let contract = `/projects/contracts/${project.id}`;

    let { id, name, startTime, endTime, firstParty, contractVal, stageName, process } = project;

    connection.end();
    res.status(200).json({
      project: {
        id,
        name,
        startTime,
        endTime,
        firstParty,
        contractVal: +contractVal,
        stage: stageName,
        process,
        leader,
        members,
        contract
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = getProjectsDetail;