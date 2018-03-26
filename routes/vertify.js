let jwt = require('jsonwebtoken');
let createConnection = require('../utils/create-connection');
let config = require('../config');
let query = require('../utils/query');

const SECRECT = config.secrect;

/**
 * 检验请求中cookie是否包含token ,且token是否合法
 */
async function hasToken(req, res, next) {
  let reg = /(\/login)|(\/logout)|(\/register)|(\/options)|(\/password$)/; //  无需检验token的接口
  let reg2 = /\.(js|css|html|jpg|ico|txt)$/;  //  静态文件无需检验token
  let path = req.path;
  if (reg.test(path) || reg2.test(path)) {
    next();
  } else {
    try {
      //  缺少token
      if (!req.cookies.token) {
        return next(new ResponseError('缺少令牌', 401));
      }

      let decode = jwt.verify(req.cookies.token, SECRECT);

      //  解密出来的id非法
      if (typeof decode.id !== 'number') {
        return next(new ResponseError('无效的令牌', 401));
      }

      let connection = createConnection();

      let rs = (await query.all(connection, 'users', 'id', decode.id))[0];
      connection.end();

      //  不存在此id的用户
      if (!rs) {
        return next(new ResponseError('无效的令牌', 401));
      }

      req.id = decode.id;
      req.role = rs.roleId;
      next();

    } catch (err) {
      next(err);
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
  try {
    let projectId = +req.params.projectId || +req.body.projectId || +req.query.projectId;

    if (Number.isNaN(projectId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    let connection = createConnection();
    connection.connect();

    //  是否存在该项目
    let rs = (await query.all(connection, 'projects', 'id', projectId))[0];
    connection.end();

    if (rs) {
      //  管理员
      if (req.role === 0) {
        return next();
      }
      //  检验PM是否负责该项目
      if (rs.leaderId !== req.id) {
        return next(new ResponseError('你并没有负责该项目， 故无权修改该项目', 403));
      }
    } else {
      return next(new ResponseError('该项目不存在', 406));
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** 
 * 判断Plan与Project的归属关系， 避免PM越权
*/
async function isPlanExist(req, res, next) {
  try {
    let projectId = +req.params.projectId || +req.body.projectId || +req.query.projectId;
    let planId = +req.params.planId || +req.body.planId;

    if (Number.isNaN(projectId) || Number.isNaN(planId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    let connection = createConnection();
    connection.connect();

    let rs = (await query.sql(connection,
      `select * from plans where id = ${planId} and belongTo = ${projectId}`))[0];

    connection.end();
    if (!rs) {
      return next(new ResponseError('计划不存在', 406));
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function isEventExist(req, res, next) {
  try {
    let planId = +req.body.planId;
    let eventId = +req.params.eventId;

    if (Number.isNaN(planId) || Number.isNaN(eventId)) {
      return next(new ResponseError('缺少参数', 406));
    }
    let connection = createConnection();
    connection.connect();

    let rs = (await query.sql(connection,
      `select * from events where id = ${eventId} and belongTo = ${planId}`))[0];

    connection.end();
    if (!rs) {
      return next(new ResponseError('事件不存在', 406));
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  hasToken,
  isAdmin,
  isPM,
  isOnDuty,
  isPlanExist,
  isEventExist
}