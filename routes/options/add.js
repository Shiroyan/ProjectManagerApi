let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');

async function add(req, res, next) {
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
      break;
    default:
      return next(new ResponseError('接口不存在', 404));
  }

  let name = req.body.name;
  let desc = req.body.desc || '无';
  let status = +req.body.status || 1;

  if (!name) {
    return next(new ResponseError('缺少参数', 406));
  }

  try {
    let connection = createConnection();
    connection.connect();

    //  是否存在同名项
    let rs = await query.sql(connection,
      `SELECT id FROM ${tableName} WHERE name = '${name}'`);
    if (rs.length > 0) {
      return next(new ResponseError('已存在同名项', 406));
    }

    let sql = `INSERT INTO ${tableName} SET name = '${name}'`;

    //  stages的添加
    type === 'stage' &&
      (sql += `, \`desc\` = '${desc}', status = ${status}`);

    rs = await query.sql(connection, sql);

    connection.end();

    if (rs.affectedRows > 0) {
      res.status(200).json({
        msg: '添加成功'
      });
    } else {
      return next(new ResponseError('添加失败, 未知原因', 500));
    }

  } catch (err) {
    return next(err);
  }
}

module.exports = add;