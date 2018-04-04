let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');

async function update(req, res, next) {
  let type = req.params.type;
  let tableName, paramKey, paramName;
  switch (type) {
    case 'dep':
      tableName = 'departments';
      paramKey = 'depId';
      paramName = 'depName';
      break;
    case 'job':
      tableName = 'jobs';
      paramKey = 'jobId';
      paramName = 'jobName';
      break;
    case 'city':
      tableName = 'citys';
      paramKey = 'cityId';
      paramName = 'cityName';
      break;
    case 'stage':
      tableName = 'stages';
      paramKey = 'stageId';
      paramName = 'stageName';
      break;
    case 'tag':
      tableName = 'tags';
      paramKey = 'tagId';
      paramName = 'tagName';
      break;
    default:
      return next(new ResponseError('接口不存在', 404));
  }

  let id = +req.params.id;
  let name = req.body.name;
  let desc = req.body.desc || '无';
  let status = +req.body.status || 1;

  if (!id || !name) {
    return next(new ResponseError('缺少参数/参数非法', 406));
  }
  if (type === 'job' && id === 5) {//..jobId为5，PM不可修改，删除
    return next(new ResponseError('不可更改此项', 403));
  }

  try {
    let connection = createConnection();
    connection.connect();

    //  是否存在同名项
    let rs = await query.sql(connection,
      `SELECT id FROM ${tableName} WHERE name = '${name}' AND id <> ${id}`);
    if (rs.length > 0) {
      return next(new ResponseError('已存在同名项', 406));
    }

    //  更新${tableName}表
    let sql = `UPDATE ${tableName} SET name = '${name}' WHERE id = ${id}`;

    //  stages的更新
    if (type === 'stage') {
      sql = `UPDATE ${tableName} SET name = '${name}', \`desc\` = '${desc}', status = ${status} WHERE id = ${id}`;
    }

    rs = await query.sql(connection, sql);
    let { affectedRows } = rs;

    if (affectedRows > 0) {
      let table;
      switch (type) {
        case 'tag':
          table = 'events_tags'; break;
        case 'stage':
          table = 'projects'; break;
        default:
          table = 'users';
      }
      //  更新 用户/项目/事件 信息
      let sql = `UPDATE ${table} SET ${paramName} = '${name}' WHERE ${paramKey} = ${id}`;
      rs = await query.sql(connection, sql);
    } else {
      return next(new ResponseError('更新失败, 不存在此id', 406));
    }

    connection.end();
    res.status(200).json({
      msg: '更新成功',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = update;