let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

/**
 *  1. 在更新之前需要查找旧的数据（该用户、该日期，事件未被删除的）
 *  2. 对比新旧数据的单向偏差值，总和偏差值
 *  3. 事件有可能已经被删除了？ 
 *      - 在编辑的时候会拉取未被删除的事件，所以不必担心修改已删除的事件，事件必然都是存在的
 *  4. 旧数据中包含了已被删除的事件？
 *      - 所以在筛选旧数据的时候需要过滤掉已删除的事件，避免总偏差值出现错乱
 *  5. 根据偏差值去update events表（未被删除）
 *  6. 根据总偏差值去update statistics表（该用户，传入时间的时段）
 */

async function updateDaily(req, res, next) {
  
}