let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 *  1. 找出旧数据（事件未被删除的）
 *  2. 更新events表（未被删除的）
 *  3. 更新statistics表（该时段）
 */
async function deleteDaily(req, res, next) {
  
}