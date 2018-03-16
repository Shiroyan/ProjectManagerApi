let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function downloadContract(req, res, next) {
  let projectId = +req.params.projectId;

  let error = validate(new Map([
    ['projectId', projectId]
  ]));
  if (error) {
    return next(error);
  }

  try {
    let connection = createConnection();
    connection.connect();

    let rs = (await query.one(connection, 'contract','projects', 'id', projectId))[0];
    
    connection.end();
    
    if (rs) {
      res.sendFile(rs.contract);
    } else {
      return next(new ResponseError('项目不存在', 406));
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = downloadContract;