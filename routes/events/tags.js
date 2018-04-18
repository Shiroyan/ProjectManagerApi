let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getTags(req, res, next) {
  let connection;
  try {
    connection = createConnection();

    let rs = await query.sql(connection, 'SELECT id, name FROM tags');

    res.status(200).json(rs);

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

async function addTag(req, res, next) {
  let name = req.body.name;
  let error = validate(new Map([
    ['tagName', name]
  ]));
  if (error) {
    return next(error);
  }

  let connection;
  try {
    connection = createConnection();

    let rs = await query.one(connection, 'name', 'tags', 'name', name);
    if (rs[0]) {
      return next(new ResponseError('该标签已存在', 406));
    }

    await query.insert(connection, 'tags', {
      name
    });

    res.status(201).json({
      msg: '添加成功'
    });
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = {
  getTags,
  addTag
};