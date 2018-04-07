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
    leaderId: +b.leaderId,
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
    ['uid', project.leaderId],
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


    //  检验项目转让人是否为PM
    let roleId = (await query.sql(connection, `SELECT roleId FROM users WHERE id = ${project.leaderId}`))[0].roleId;
    if (roleId !== 1) {
      return next(new ResponseError('转让人不是PM', 406));
    }

    //  对members进行处理
    let members = [];
    b.members && (members = b.members.toArray());
    members.push(project.leaderId);
    members = [...new Set(members)];  //  去重

    //  校验更换的成员是否有负责的事件
    let curMembers = await query.sql(connection,
      `SELECT userId FROM users_projects WHERE projectId = ${projectId}`);
    curMembers = curMembers.map(u => u.userId);
    let differ = curMembers.filter(id => !members.includes(id));  //  找出被移除的成员id
    if (differ.length > 0) {
      let events = await query.sql(connection, `SELECT id FROM events WHERE isDeleted = 0 AND projectId = ${projectId} AND
      id in (SELECT eventId FROM users_events WHERE userId in (${differ.join(',')}) )`);

      if (events.length > 0) {
        return next(new ResponseError('移除的成员尚有负责的事件', 406));
      }
    }


    //  把members中id对应的用户名存储在projects中
    let users = await query.sql(connection, `select username from users where id in (${members.join(',')})`);
    let membersName = users.map(user => user.username) || [];
    project.members = membersName.join(',');

    //  更新项目资料
    await query.update(connection, 'projects', project, 'id', projectId);

    //  处理users-projects的归属关系, 先删除之前所有的
    await query.delete(connection, 'users_projects', 'projectId', projectId);

    let data = members.map(userId => `(${userId}, ${projectId})`) || [];
    data = data.join(',');

    rs = await query.inserts(connection, 'users_projects', data);

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