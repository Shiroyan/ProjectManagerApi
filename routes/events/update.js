let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 * 更新事件，不允许变动创建事件的时间，若要变动请另新增事件
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
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

  let { desc } = b;
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

    //#region  旧数据
    let old = (await query.sql(connection, `SELECT planTime, realTime, approval, startTime, endTime FROM events WHERE id = ${eventId} AND isDeleted = 0`))[0];
    if (!old) {
      return next(new ResponseError('事件不存在', 406));
    }
    //  旧成员
    let oMembers = await query.sql(connection,
      `SELECT userId AS id FROM users_events WHERE eventId = ${eventId}`);
    oMembers = oMembers.map(({ id }) => id);
    let oMembersStr = oMembers.join(',');
    //  旧标签
    let oTags = await query.sql(connection,
      `SELECT tagId AS id FROM events_tags WHERE eventId = ${eventId}`);
    oTags = oTags.map(({ id }) => id);
    oTagsStr = oTags.join(',');

    //  时间是不允许更改的
    let startTime = old.startTime.format('yyyy-MM-dd hh:mm:ss');
    let endTime = old.endTime.format('yyyy-MM-dd hh:mm:ss');
    //#endregion

    //#region 新数据
    //  新成员
    let nMembers = members.slice(0);
    let nMembersStr = nMembers.join(',');
    //  新标签
    let nTags = tags.slice(0);
    let nTagsStr = tags.join(',');
    //#endregion

    //#region 更新users_events关系

    //  根据传入的userid数组，找出它们的 username、jobId
    rs = await query.sql(connection, `SELECT id, username, jobId FROM users WHERE id IN (${nMembersStr})`);

    let data = rs.map(({ id, username, jobId }) => `(${id}, "${username}", ${jobId}, ${eventId})`);
    if (nMembersStr !== oMembersStr) {
      await query.delete(connection, 'users_events', 'eventId', eventId);
      await query.inserts(connection, 'users_events', data.join(','));
    }
    //#endregion

    //#region 更新events_tags关系

    //  根据传入的tagid数组，找出tag的name
    rs = await query.sql(connection, `SELECT id, name FROM tags WHERE id in (${nTagsStr})`);
    //  写入events_tags表
    data = rs.map(({ id, name }) => `(${id}, "${name}", ${eventId})`);
    if (nTagsStr !== oTagsStr) {
      await query.delete(connection, 'events_tags', 'eventId', eventId);
      await query.inserts(connection, 'events_tags', data.join(','));
    }
    //#endregion

    //#region   更新statistics表 - 成员变动
    let planOffset = planTime - old.planTime,
      realOffset = realTime - old.realTime,
      approvalOffset = approval - old.approval;

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