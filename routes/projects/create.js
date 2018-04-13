let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function createProject(req, res, next) {

  let b = req.body;
  let project = {
    name: b.name,
    firstParty: b.firstParty,
    startTime: b.startTime,
    endTime: b.endTime,
    leaderIds: req.id,
    stageId: +b.stageId || 1,
    contractVal: +b.contractVal,    // 合同金额  
  };

  //  是否有上传合同文件
  req.file && (project.contract = req.file.path.replace(/\\/g, '/'));

  //  校验参数是否正确
  let error = validate(new Map([
    ['projectName', project.name],
    ['firstParty', project.firstParty],
    ['startTime', project.startTime],
    ['endTime', project.endTime],
    ['contractVal', project.contractVal]
  ]))
  if (error) {
    return next(error);
  }


  try {
    let connection = createConnection();
    connection.connect();

    //  检验是否存在同名项目
    let rs = await query.sql(connection,
      `SELECT id FROM projects WHERE name = '${project.name}' AND isDeleted = 0`);
    if (rs.length > 0) {
      return next(new ResponseError('创建失败，已存在同名项目', 406));
    }

    //  对members进行处理
    let members = b.members.toArray();             // 剔除非法的id
    members = members.filter(id => id !== req.id); // leader不属于members
    project.memberIds = members.join(',');


    //  写入数据库, 创建项目
    rs = await query.insert(connection, 'projects', project);
    let projectId = rs.insertId;


    //  处理users-projects的归属关系
    let data = members.map(userId => `(${userId}, ${projectId})`);
    data.push(`(${req.id}, ${projectId})`);
    data = data.join(',');

    rs = await query.inserts(connection, 'users_projects', data);

    connection.end();

    //  返回
    res.status(201).json({
      msg: '项目创建成功'
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = createProject;