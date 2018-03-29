let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getTags(req, res, next) {
  try {
    let connection = createConnection();
    connection.connect();

    let rs = await query.view(connection, 'getTags');

    connection.end();
    res.status(200).json(rs);

  } catch (err) {
    return next(err);
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

  try {
    let connection = createConnection();
    connection.connect();

    let rs = await query.one(connection, 'name', 'tags', 'name', name);
    if (rs[0]) {
      return next(new ResponseError('该标签已存在', 406));
    }

    await query.insert(connection, 'tags', {
      name
    });

    connection.end();
    res.status(201).json({
      msg: '添加成功'
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getTags,
  addTag
};