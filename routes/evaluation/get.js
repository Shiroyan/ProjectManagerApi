let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getAllEvaluation(req, res, next) {
  let year = +req.params.year || new Date().getFullYear();

  let nextYear = year + 1;
  year += ''; // toString
  nextYear += '';

  const YEAR_START = Date.getFirstMonday(new Date(year)).format('yyyy-MM-dd hh:mm:ss');
  const YEAR_END = Date.getFirstMonday(new Date(nextYear)).format('yyyy-MM-dd hh:mm:ss');

  let connection;
  try {
    connection = createConnection();

    let rs = await query.sql(connection,
      `SELECT projectId AS id, projectName AS name, ratio, date FROM evaluation WHERE 
      date BETWEEN '${YEAR_START}' AND '${YEAR_END}' ORDER BY date`);
    
    let data = {};
    for (let temp of rs) {
      //  逆序 12 - (12 - 2)
      let key = 12 - (new Date(temp.date).getMonth() + 1);
      !data[key] && (data[key] = []);
      data[key].push(temp);
    }

    res.status(200).json(data);
  } catch (err) {
    next(err);
  } finally {
    connection.end();
  }
}

module.exports = {
  getAllEvaluation
}