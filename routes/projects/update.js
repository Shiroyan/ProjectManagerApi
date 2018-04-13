let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');


async function updateProject(req, res, next) {

  let projectId = +req.params.projectId;
  let b = req.body;
  let project = {
    name: b.name,
    firstParty: b.firstParty,
    startTime: b.startTime,
    endTime: b.endTime,
    stageId: +b.stageId,
    process: +b.process,
    contractVal: +b.contractVal,    // 合同金额  
  };

  //  是否有上传合同文件
  req.file && (project.contract = req.file.path.replace(/\\/g, '/'));

  //  校验参数是否正确
  let error = validate(new Map([
    ['projectId', projectId],
    ['projectName', project.name],
    ['firstParty', project.firstParty],
    ['startTime', project.startTime],
    ['endTime', project.endTime],
    ['contractVal', project.contractVal],
    ['stageId', project.stageId],
    ['process', project.process],
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    // 检验项目名是否已存在
    rs = await query.sql(connection,
      `SELECT id FROM projects WHERE isDeleted = 0 AND name = '${project.name}' AND id <> ${projectId}`);
    if (rs.length > 0) {
      return next(new ResponseError('已存在该项目名', 406));
    }

    rs = await query.sql(connection, `SELECT leaderIds, memberIds FROM projects WHERE id = ${projectId}`);

    //  对members进行处理
    let leaderIds = rs[0].leaderIds.toArray();
    let members = b.members.toArray();              // 剔除非法的id
    members = members.filter(id => -1 !== leaderIds.indexOf(id));  // leader不属于members 

    //  校验更换的成员是否有负责的事件
    let curMembers = rs[0].memberIds.toArray();
    let delMembers = Array.differ(curMembers, members);  //  移除的成员id
    let newMembers = Array.differ(members, curMembers);  //  新增的成员id
    if (delMembers.length > 0) {
      let events = await query.sql(connection,
        `SELECT id FROM events WHERE isDeleted = 0 AND projectId = ${projectId} AND
      id in (SELECT eventId FROM users_events WHERE userId in (${delMembers.join(',')}) )`);

      if (events.length > 0) {
        return next(new ResponseError('移除的成员尚有负责的事件', 406));
      }
    }

    //#region 处理users_projects的归属关系
    if (delMembers.length > 0) {
      await query.sql(connection, `DELETE FROM users_projects WHERE userId IN (${delMembers.join(',')})`)
    }
    if (newMembers.length > 0) {
      let data = newMembers.map(userId => `(${userId}, ${projectId})`);
      await query.sql(connection, `INSERT INTO users_projects VALUES ${data.join(',')}`);
    }
    //#endregion

    //  更新项目资料
    project.memberIds = members.join(',');
    await query.update(connection, 'projects', project, 'id', projectId);
    await query.sql(connection, 
      `UPDATE events SET projectName = '${project.name}' WHERE projectId = ${projectId}`);

    connection.end();

    //  返回
    res.status(200).json({
      msg: '更新项目资料成功'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = updateProject;