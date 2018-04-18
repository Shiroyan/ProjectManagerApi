let jwt = require('jsonwebtoken');
let createConnection = require('../utils/create-connection');
let config = require('../config');
let query = require('../utils/query');

const SECRECT = config.secrect;

/**
 * 检验请求中cookie是否包含token ,且token是否合法
 */
async function hasToken(req, res, next) {
  let reg = /(\/login)|(\/logout)|(\/register)|(\/options$)|(\/password$)/; //  无需检验token的接口
  let reg2 = /\.(js|css|html|jpg|ico|txt)$/;  //  静态文件无需检验token
  let path = req.path;
  if (reg.test(path) || reg2.test(path)) {
    next();
  } else {
    let connection;
    try {
      //  缺少token
      if (!req.cookies.token) {
        return next(new ResponseError('缺少令牌、请重新登录', 401));
      }

      let decode = jwt.verify(req.cookies.token, SECRECT);

      //  解密出来的id非法
      if (typeof decode.id !== 'number') {
        return next(new ResponseError('无效的令牌', 401));
      }

      connection = createConnection();

      let rs = (await query.sql(connection,
        `SELECT roleId FROM users WHERE id = ${decode.id} AND isDeleted = 0`))[0];

      //  不存在此id的用户
      if (!rs) {
        return next(new ResponseError('无效的令牌', 401));
      }

      req.id = +decode.id;
      req.role = rs.roleId;
      next();

    } catch (err) {
      next(err);
    } finally {
      connection && connection.end();
    }
  }
}

function isAdmin(req, res, next) {
  if (req.role !== 0) {
    return new next(new ResponseError('没有权限', 403));
  }
  next();
}

function isPM(req, res, next) {
  if (req.role !== 0 && req.role !== 1) {
    return next(new ResponseError('没有权限', 403));
  }
  next();
}

/** 
 * 判断PM与Project的关系， 避免PM越权
*/
async function isOnDuty(req, res, next) {
  let connection;
  try {
    let projectId = +req.params.projectId || +req.body.projectId || +req.query.projectId;

    if (Number.isNaN(projectId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    connection = createConnection();

    //  是否存在该项目
    let rs = (await query.sql(connection,
      `SELECT leaderIds FROM projects
      WHERE id = ${projectId} AND isDeleted = 0`))[0];

    let error = null;
    if (rs) {
      //  管理员
      if (req.role === 0) {
        error = null;
      } else {
        let leaderIds = rs.leaderIds.toArray();
        //  检验PM是否负责该项目
        if (leaderIds.indexOf(req.id) === -1) {
          error = new ResponseError('你并没有负责该项目， 故无权修改该项目', 403);
        }
      }
    } else {
      error = new ResponseError('该项目不存在', 406);
    }
    !error ? next() : next(error);
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

/** 
 * 判断Plan与Project的归属关系， 避免PM越权
*/
async function isPlanExist(req, res, next) {
  let connection;
  try {
    let projectId = +req.params.projectId || +req.body.projectId || +req.query.projectId;
    let planId = +req.params.planId || +req.body.planId;

    if (Number.isNaN(projectId) || Number.isNaN(planId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    connection = createConnection();

    let rs = (await query.sql(connection,
      `SELECT id FROM plans WHERE id = ${planId} AND belongTo = ${projectId}`))[0];

    !rs ?
      next(new ResponseError('计划不存在', 406)) : next();
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

async function isEventExist(req, res, next) {
  let connection;
  try {
    let planId = +req.body.planId;
    let eventId = +req.params.eventId;

    if (Number.isNaN(planId) || Number.isNaN(eventId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    connection = createConnection();

    let rs = (await query.sql(connection,
      `SELECT id FROM events WHERE id = ${eventId} AND belongTo = ${planId}`))[0];

    !rs ? 
      next(new ResponseError('事件不存在', 406)) : next();
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();    
  }
}

async function isTableExist(connection, tableName) {

  try {
    let rs = await query.sql(connection,
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_NAME = '${tableName}'`)

    return new Promise((resolve, reject) => resolve(rs.length !== 0));

  } catch (err) {
    return new Promise((resolve, reject) => reject(false));
  }
}

module.exports = {
  hasToken,
  isAdmin,
  isPM,
  isOnDuty,
  isPlanExist,
  isEventExist,
  isTableExist
}