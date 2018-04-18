let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');

async function _delete(req, res, next) {
  let type = req.params.type;
  let tableName, paramKey;
  switch (type) {
    case 'dep':
      tableName = 'departments';
      paramKey = 'depId';
      break;
    case 'job':
      tableName = 'jobs';
      paramKey = 'jobId';
      break;
    case 'city':
      tableName = 'citys';
      paramKey = 'cityId';
      break;
    case 'stage':
      tableName = 'stages';
      break;
    case 'tag':
      tableName = 'tags';
      break;
    default:
      return next(new ResponseError('接口不存在', 404));
  }

  let id = +req.params.id;

  if (!id) {
    return next(new ResponseError('缺少参数/参数非法', 406));
  }
  //.. jobId为5，PM不可修改/删除 因为jobId = 5 和roleId = 1 进行了绑定

  // if (type === 'job' && id === 5) {
  //   return next(new ResponseError('不可更改此项', 403));
  // }

  let connection;
  try {
    connection = createConnection();
    

    //  查找该项是否有被使用
    let sql = `SELECT id FROM users WHERE ${paramKey} = ${id}`;
    if (type === 'tag') {
      sql = `SELECT tagId FROM events_tags WHERE tagId = ${id}`;
    }
    if (type === 'stage') {
      sql = `SELECT stageId FROM projects WHERE stageId = ${id}`;
    }

    let rs = await query.sql(connection, sql);

    if (rs.length > 0) {
      return next(new ResponseError('该项正被使用，不可删除', 403));
    }

    rs = await query.sql(connection,
      `DELETE FROM ${tableName} WHERE id = ${id}`);


    if (rs.affectedRows > 0) {
      res.status(200).json({
        msg: '删除成功'
      });
    } else {
      next(new ResponseError('删除失败, id不存在', 406));
    }

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = _delete;