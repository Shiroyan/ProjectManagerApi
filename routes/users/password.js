let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function changePwdByUser(req, res, next) {
  let ac = req.body.account,
    nPwd = req.body.newPwd,
    oPwd = req.body.oldPwd;

  //  验证参数
  let error = validate(new Map([
    ['account', ac],
    ['newPwd', nPwd],
    ['oldPwd', oPwd]
  ]));
  if (error) {
    return next(error);
  }

  //  新旧密码不能一样
  if (nPwd === oPwd) {
    return next(new ResponseError('新旧密码不能一样', 406));
  }

  try {
    let connection = createConnection();
    let rs = (await query.all(connection, 'users', 'account', ac))[0];

    if (!rs) {
      return next(new ResponseError('账号不存在', 406));
    } else if (rs.password !== oPwd) {
      return next(new ResponseError('旧密码错误', 406));
    } else {
      await query.update(connection, 'users', {
        password: nPwd
      }, 'account', ac);

      connection.end();
      res.status(200).json({
        msg: '修改成功'
      });
    }
  } catch (err) {
    next(err);
  }
}

//  已废弃
async function changePwdByAdmin(req, res, next) {
  let changeId = +req.params.uid;
  let id = req.id;
  let newPwd = req.body.newPwd;

  //  校验参数
  let error = validate(new Map([
    ['uid', changeId],
    ['newPwd', newPwd]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    let affectedRow = await query.update(connection, 'users', {
      password: newPwd
    }, 'id', changeId);

    connection.end();

    res.status(200).json({
      msg: '修改成功'
    });

  } catch (err) {
    next(err);
  }

}


module.exports = {
  changePwdByUser,
  changePwdByAdmin
};