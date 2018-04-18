let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function _createEvent(connection, data) {

  let {
    projectId,
    planId,
    planTime,
    startTime,
    endTime,
    desc,
    members,
    tags
  } = data;

  try {

    let projectName = (await query.one(connection, 'name', 'projects', 'id', projectId))[0].name;

    /**
     * 一个事件不能对应多个用户，一个事件必须对应一个用户。否则其中一个成员修改事件将会牵连别的人
     * 当创建一个多人参与的事件时，转化为批量创建 1 to 1 的事件
     */

    let UEData = [];
    let eventIds = [];
    for (let userId of members) {
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

      eventIds.push(eventId);

      //  查找username
      let rs = await query.sql(connection,
        `SELECT id, username, jobId FROM users WHERE id = ${userId}`);

      let { id, username, jobId } = rs[0];
      UEData.push(`(${id}, '${username}', ${jobId}, ${eventId})`);
    }

    //#region 创建users_events关系
    await query.sql(connection, `INSERT INTO users_events (userId, username, jobId, eventId ) VALUES ${UEData.join(',')}`);
    //#endregion

    //#region 创建events_tags关系
    if (tags.length > 0) {
      rs = await query.sql(connection,
        `SELECT id, name FROM tags WHERE id in (${tags.join(',')})`);  // 找出tag的name

      //  写入events_tags表
      let ETData = [];
      for (let eventId of eventIds) {
        for (let tag of rs) {
          ETData.push(`(${tag.id}, '${tag.name}', ${eventId})`);
        }
      }
      await query.sql(connection, `INSERT INTO events_tags (tagId, tagName, eventId) VALUES ${ETData.join(',')}`);
    }
    //#endregion


    //#region 更新statistics表
    let nMembers = members;
    let sql = `update statistics set planTime = planTime + ${planTime}
    where userId in (${nMembers.join(',')}) 
    and ('${startTime}' between startTime and endTime and '${endTime}' between startTime and endTime)`;

    await query.sql(connection, sql);
    //#endregion
    return new Promise((resolve, reject) => {
      resolve();
    });
  } catch (err) {
    return new Promise((resolve, reject) => {
      reject(err);
    });
  }
}

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
  ]));
  if (error) {
    return next(error);
  }

  const SEVENT_DAY = 1000 * 60 * 60 * 24 * 7;
  const END = Date.getWeekEnd(endTime);
  const START = Date.getWeekStart(startTime);
  if (END - START > SEVENT_DAY) {
    return next(new ResponseError('起止时间需在同一周内', 406));
  }

  let connection;
  try {
    connection = createConnection();

    desc = desc.transfer();
    await _createEvent(connection, {
      projectId,
      planId,
      planTime,
      startTime,
      endTime,
      desc,
      members,
      tags
    });

    res.status(201).json({
      msg: '创建成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}



module.exports = {
  createEvent,
  _createEvent
};