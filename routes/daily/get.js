let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

async function getDailyDetail(req, res, next) {
  let date = req.query.date || new Date();
  date = new Date(date);
  
}