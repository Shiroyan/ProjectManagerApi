let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let config = require('../../config');
let validate = require('../../utils/validate');
let { isAdmin } = require('../vertify');

let register = require('./register');
let login = require('./login');
let autoLogin = require('./auto-login');
let logout = require('./logout');
let { getProfile, updateProfile, updateProfileByAdmin } = require('./profile');
let { changePwdByUser, changePwdByAdmin } = require('./password');
let options = require('./options');
let { divideUsersByDep, divideUsersByJob } = require('./departments');

//  删除用户
async function deleteUser(req, res, next) {
  let deleteId = +req.params.uid;
  let id = req.id;
  let status;
  let msg;

  //  校验uid是否正确
  let error = validate(new Map([
    ['uid', deleteId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();
    //  检查是否有正在参与的项目
    let projects = await query.sql(connection,
      `SELECT id FROM projects WHERE
    isDeleted = 0 AND
    id in (SELECT projectId FROM users_projects WHERE userId = ${deleteId})`);
    if (projects.length > 0) {
      return next(new ResponseError('该用户还有负责的项目!', 406));
    }

    await query.sql(connection,
      `UPDATE users SET 
      isDeleted = 1,
      deletedAt = '${new Date().format('yyyy-MM-dd hh:mm:ss')}'
      WHERE id = ${deleteId}`);

    connection.end();
    res.status(200).json({
      msg: '删除成功'
    }).end();

  } catch (err) {
    next(err);
  }
}

//  获取用户列表
async function getUsersList(req, res, next) {
  try {
    let sql = `SELECT id, username, cityId, cityName, depId, depName, jobId, jobName
    FROM users WHERE isDeleted = 0 AND id <> 0`;
    if (req.role === 0) {
      sql = `SELECT account, id, username, cityId, cityName, depId, depName, jobId, jobName, roleId
      FROM users WHERE isDeleted = 0`;
    }
    let connection = createConnection();
    let rs = await query.sql(connection, sql);
    connection.end();

    res.status(200).json(rs).end();

  } catch (err) {
    next(err);
  }
}


router.post('/login', login);
router.post('/autologin', autoLogin);
router.get('/departments', divideUsersByDep);
router.get('/departments/:depId', divideUsersByJob);
router.post('/logout', logout);
router.get('/options', options);
router.put('/password', changePwdByUser);
// router.put('/password/:uid', [isAdmin, changePwdByAdmin]);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/:uid', [isAdmin, updateProfileByAdmin]);
router.post('/register', register);
router.delete('/:uid', [isAdmin, deleteUser]);
router.get('/', getUsersList);


module.exports = router;
