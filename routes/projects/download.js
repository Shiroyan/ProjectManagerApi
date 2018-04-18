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
  let connection;
  try {
    connection = createConnection();

    let rs = (await query.one(connection, 'contract','projects', 'id', projectId))[0];
        
    if (rs) {
      res.sendFile(rs.contract);
    } else {
      next(new ResponseError('项目不存在', 406));
    }
  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();    
  }
}

module.exports = downloadContract;