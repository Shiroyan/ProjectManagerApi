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

  let connection;
  try {
    connection = createConnection();
    let rs = (await query.all(connection, 'users', 'account', ac))[0];

    oPwd = (await query.sql(connection, `SELECT PASSWORD('${oPwd}')`))[0][`PASSWORD('${oPwd}')`];
    nPwd = (await query.sql(connection, `SELECT PASSWORD('${nPwd}')`))[0][`PASSWORD('${nPwd}')`];
    
    let error;
    //  新旧密码不能一样
    if (nPwd === oPwd) {
      error = next(new ResponseError('新旧密码不能一样', 406));
    }

    if (!rs) {
      error = next(new ResponseError('账号不存在', 406));
    } else if (rs.password !== oPwd) {
      error = next(new ResponseError('旧密码错误', 406));
    } 
    if (error) {
      return next(error);
    } else {
      await query.update(connection, 'users', {
        password: nPwd
      }, 'account', ac);

      res.status(200).json({
        msg: '修改成功'
      });
    }
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

//  已废弃
async function changePwdByAdmin(req, res, next) {
  let changeId = +req.params.uid;
  let id = req.id;
  let newPwd = req.body.newPwd;

  //  校验参数
  let error = validate(new Map([
    ['userId', changeId],
    ['newPwd', newPwd]
  ]));
  if (error) {
    return next(error);
  }

  try {
    connection = createConnection();
    let affectedRow = await query.update(connection, 'users', {
      password: newPwd
    }, 'id', changeId);

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