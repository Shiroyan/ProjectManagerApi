let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function createEvent(req, res, next) {
  let b = req.body;
  let planId = +b.planId,
    projectId = +b.projectId,
    planTime = +b.planTime;

  let { desc, startTime, endTime } = b;
  let members = b.members.toArray();
  let tags = b.tags.toArray();

  let error = validate(new Map([
    ['planId', planId],
    ['projectId', projectId],
    ['planTime', planTime],
    ['startTime', startTime],
    ['endTime', endTime],
    ['desc', desc],
    ['members', members],
    ['tags', tags]
  ]));
  if (error) {
    return next(error);
  }


  try {
    let connection = createConnection();
    connection.connect();

    let projectName = (await query.one(connection, 'name', 'projects', 'id', projectId))[0].name;
    //  插入数据
    let eventId = (await query.insert(connection, 'events', {
      belongTo: planId,
      desc,
      startTime,
      endTime,
      planTime,
      projectId,
      projectName
    })).insertId;

    //#region 创建users_events关系
    //  根据传入的userid数组，找出它们的username
    let rs = await query.sql(connection,
      `SELECT id, username, jobId FROM users WHERE id IN (${members.join(',')})`);
    //  写入users_events
    let data = rs.map(({ id, username, jobId }) => `(${id}, "${username}", ${jobId}, ${eventId})`);
    await query.inserts(connection, 'users_events', data.join(','));
    //#endregion

    //#region 创建events_tags关系
    //  根据传入的tagid数组，找出tag的name
    rs = await query.sql(connection, 
      `SELECT id, name FROM tags WHERE id in (${tags.join(',')})`);

    //  写入events_tags表
    data = rs.map(({ id, name }) => `(${id}, "${name}", ${eventId})`);
    await query.inserts(connection, 'events_tags', data.join(','));
    //#endregion

    //#region 更新statistics表
    let nMembers = b.members.toArray();

    let sql = `update statistics set planTime = planTime + ${planTime}
    where userId in (${nMembers.join(',')}) 
    and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;

    await query.sql(connection, sql);
    //#endregion

    connection.end();
    res.status(201).json({
      msg: '创建成功'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = createEvent;