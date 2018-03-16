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


    //  根据传入的userid数组，找出它们的username
    let rs = await query.sql(connection, `select id, username from users where id in (${members.join(',')})`);
    //  写入users_events
    let data = [];
    members = [];
    rs.forEach(temp => {
      let { id, username } = temp;
      data.push(`(${id}, "${username}", ${eventId})`);
      //  把参与用户的信息，转成数组，再转成JSON存入数据库
      members.push({ id, username });
    });
    await query.inserts(connection, 'users_events', data.join(','));


    //  根据传入的tagid数组，找出tag的name
    rs = await query.sql(connection, `select * from tags where id in (${tags.join(',')})`);
    //  写入events_tags表
    data = [];
    tags = [];
    rs.forEach(temp => {
      let { id, name } = temp;
      data.push(`(${id}, "${name}", ${eventId})`);
      //  把参与用户的信息，转成数组，再转成JSON存入数据库
      tags.push({ id, name });
    });
    await query.inserts(connection, 'events_tags', data.join(','));

    //#region 更新statistics表
    let nMembers = b.members.toArray();

    let sql = `update statistics set planTime = planTime + ${planTime}
    where userId in (${nMembers.join(',')}) 
    and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;

    await query.sql(connection, sql);
    //#endregion

    await query.update(connection, 'events', {
      members: JSON.stringify(members),
      tags: JSON.stringify(tags)
    }, 'id', eventId);

    connection.end();
    res.status(201).json({
      msg: '创建成功'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = createEvent;