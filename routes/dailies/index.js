let router = require('express').Router();
let schedule = require('node-schedule');
let query = require('../../utils/query');
let createConnection = require('../../utils/create-connection');

let createDaily = require('./create');
let { getDailyAbstract, getDailyDetail } = require('./get');
let updateDaily = require('./update');
let deleteDaily = require('./delete');

/**  
 * 每月创建一个日报表，命名格式为 daily_yyyyMM
 * 每月创建一个日报事件关系表，命名格式为 daily_events_yyyyMM
 * 
 *     0 0 0 1 * *  - 每月1号
 */
schedule.scheduleJob('0 0 0 1 * *', async function () {
  console.log('开始执行创建 <日报表> <日报事件关系表> 脚本');
  try {
    let connection = createConnection();
    connection.connect();
    let dateStr = new Date().format('yyyyMM');

    await query.sql(connection, `CREATE TABLE daily_${dateStr} LIKE daily_tpl`);
    await query.sql(connection, `CREATE TABLE daily_events_${dateStr} LIKE daily_events_tpl`);

    connection.end();
    console.log('结束脚本');
  } catch (err) {
    console.error('脚本异常: ', err);
  }
});

router.post('/', createDaily);
router.get('/', getDailyAbstract);
router.get('/:did', getDailyDetail);
router.put('/', updateDaily);
router.delete('/:did', deleteDaily);

module.exports = router;