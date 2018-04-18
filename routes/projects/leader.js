let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function exchangeLeader(req, res, next) {
  let leaders = req.body.leaders;
  let projectId = +req.params.projectId;

  leaders = leaders.toArray();
  if (leaders.length === 0) {
    return next(new ResponseError('参数不能为空/参数非法'), 406);
  }

  //  校验参数是否正确
  let error = validate(new Map([['projectId', projectId]]));
  if (error) return next(error);

  let connection;
  try {
    connection = createConnection();
    let rs;
    //#region 检查它们是否为PM
    rs = await query.sql(connection,
      `SELECT roleId FROM users WHERE id IN (${leaders.join(',')})`);

    let isAllPM = rs.every(({ roleId }) => {
      return roleId === 0 || roleId === 1;
    });

    if (!isAllPM) {
      return next(new ResponseError('当中含有非PM成员'), 406);
    }
    //#endregion

    //#region 被移除的成员是否有负责的事件, 处理users_projects的关系表
    rs = await query.sql(connection, `SELECT leaderIds FROM projects WHERE id = ${projectId}`);
    let oLeaders = rs[0].leaderIds.toArray();
    let nLeaders = leaders;
    let delLeaders = Array.differ(oLeaders, nLeaders);
    let addLeaders = Array.differ(nLeaders, oLeaders);
    if (delLeaders.length > 0) {
      rs = await query.sql(connection,
        `SELECT userId FROM users_events WHERE eventId IN (SELECT id FROM events WHERE isDeleted = 0 AND projectId = ${projectId} AND isFinished = 0) AND userId IN (${delLeaders})`);
      if (rs.length > 0) {
        return next(new ResponseError('被移除的负责人尚有负责的事件', 406));
      }
      await query.sql(connection, `DELETE FROM users_projects WHERE userId IN (${delLeaders}) AND projectId = ${projectId}`);
    }
    if (addLeaders.length > 0) {
      let data = addLeaders.map(id => `(${id}, ${projectId})`);
      await query.sql(connection, `INSERT INTO users_projects VALUES ${data.join(',')}`);
    }
    //#endregion

    //  替换负责人
    await query.sql(connection, `UPDATE projects SET leaderIds = '${nLeaders.join(',')}' WHERE id = ${projectId}`);

    res.status(200).json({
      msg: '转让成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }

}
module.exports = exchangeLeader;
