let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function updateEvent(req, res, next) {
  let eventId = req.params.eventId;
  let b = req.body;
  let planId = +b.planId,
    projectId = +b.projectId,
    planTime = +b.planTime,
    realTime = +b.realTime,
    ratio = +b.ratio,
    process = +b.process,
    approval = +b.approval,
    isFinished = +b.isFinished;

  let { desc, startTime, endTime } = b;
  let members = b.members.toArray();
  let tags = b.tags.toArray();

  let error = validate(new Map([
    ['planId', planId],
    ['projectId', projectId],
    ['planTime', planTime],
    ['realTime', realTime],
    ['ratio', ratio],
    ['approval', approval],
    ['process', process],
    ['startTime', startTime],
    ['endTime', endTime],
    ['desc', desc],
    ['members', members],
    ['tags', tags],
    ['isFinished', isFinished]
  ]));
  if (error) {
    return next(error);
  }


  try {
    let connection = createConnection();
    connection.connect();

    //  旧数据
    let old = (await query.all(connection, 'events', 'id', eventId))[0];

    //  根据传入的userid数组，找出它们的username
    let uids = Array.from(members);
    rs = await query.sql(connection, `select id, username from users where id in (${uids.join(',')})`);
    //  写入users_events
    let data = [];
    members = [];
    rs.forEach(temp => {
      let { id, username } = temp;
      data.push(`(${id}, "${username}", ${eventId})`);
      //  把参与用户的信息，转成数组，再转成JSON存入数据库
      members.push({ id, username });
    });
    members = JSON.stringify(members);
    if (old.members !== members) {
      await query.delete(connection, 'users_events', 'eventId', eventId);
      await query.inserts(connection, 'users_events', data.join(','));
    }

    //  根据传入的tagid数组，找出tag的name
    let tagIds = Array.from(tags);
    rs = await query.sql(connection, `select * from tags where id in (${tagIds.join(',')})`);
    //  写入events_tags表
    data = [];
    tags = [];
    rs.forEach(temp => {
      let { id, name } = temp;
      data.push(`(${id}, "${name}", ${eventId})`);
      //  把参与用户的信息，转成数组，再转成JSON存入数据库
      tags.push({ id, name });
    });
    tags = JSON.stringify(tags);
    if (old.tags !== tags) {
      await query.delete(connection, 'events_tags', 'eventId', eventId);
      await query.inserts(connection, 'events_tags', data.join(','));
    }

    //#region   更新statistics表
    let planOffset = planTime - old.planTime,
      realOffset = realTime - old.realTime,
      approvalOffset = approval - old.approval;

    let oMembers = JSON.parse(old.members).map(m => m.id);
    let nMembers = b.members.toArray();
    //  新增成员
    let addMembers = Array.differ(nMembers, oMembers);
    //  删除成员
    let delMembers = Array.differ(oMembers, nMembers);
    //  更新statistics表
    //  删除的成员，需要减去原本的值
    //  新增的成员，需要增加新的值 
    if (delMembers.length > 0) {
      let sql = `update statistics set
      planTime = planTime - ${old.planTime},
      realTime = realTime - ${old.realTime},
      approval = approval - ${old.approval}
      where userId in (${delMembers.join(',')})
      and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;
      await query.sql(connection, sql);
    }

    if (addMembers.length > 0) {
      let sql = `update statistics set
      planTime = planTime + ${old.planTime},
      realTime = realTime + ${old.realTime},
      approval = approval + ${old.approval}
      where userId in (${addMembers.join(',')})
      and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;
      await query.sql(connection, sql);      
    }

    let sql = `update statistics set
      planTime = planTime + ${planOffset},
      realTime = realTime + ${realOffset},
      approval = approval + ${approvalOffset}
      where userId in (${nMembers.join(',')})
      and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;
    await query.sql(connection, sql);
    //#endregion

    await query.update(connection, 'events', {
      desc,
      startTime,
      endTime,
      planTime,
      realTime,
      approval,
      ratio,
      process,
      members,
      tags,
      isFinished
    }, 'id', eventId);

    connection.end();
    res.status(200).json({
      msg: '更新成功'
    });

  } catch (err) {
    return next(err);
  }
}

module.exports = updateEvent;