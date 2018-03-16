let router = require('express').Router();
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let config = require('../../config');
let validate = require('../../utils/validate');


let register = require('./register');
let login = require('./login');
let autoLogin = require('./auto-login');
let logout = require('./logout');
let { getProfile, updateProfile } = require('./profile');
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
    ['role', deleteId]
  ]));
  if (error) {
    return next(error);
  }

  if (req.role !== 0) {
    return next(new ResponseError('权限不足', 403));
  } else {
    try {
      let connection = createConnection();
      connection.connect();

      await query.delete(connection, 'users', 'id', deleteId);

      connection.end();

    } catch (err) {
      next(err);
    }
  }

  res.status(200).json({
    msg: '删除成功'
  }).end();
}

//  获取用户列表
async function getUsersList(req, res, next) {
  try {
    let connection = createConnection();

    let rs = await query.view(connection, 'USER_PROFILE');
    connection.end();

    let users = [];
    rs.forEach((ele) => {
      users.push({
        username: ele.username,
        id: ele.id
      })
    });
    res.status(200).json({
      users
    }).end();

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
router.put('/password/:uid', changePwdByAdmin);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/register', register);

router.delete('/:uid', deleteUser);
router.get('/', getUsersList);


module.exports = router;
