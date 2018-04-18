let query = require('./utils/query');
let createConnection = require('./utils/create-connection');
require('./utils/date');

async function init() {
  console.log('===> 开始数据库的初始化操作\n');
  try {
    let connection = createConnection();

    console.log('===> 开始选项初始化配置\n');        
    await query.sql(connection, `UPDATE citys SET id = 0 WHERE name = '深圳'`);
    await query.sql(connection, `UPDATE departments SET id = 0 WHERE name = '管理员'`);
    await query.sql(connection, `UPDATE jobs SET id = 0 WHERE name = '管理员'`);
    await query.sql(connection, `UPDATE users SET id = 0 WHERE account = 'szl_admin'`);
    

    let _20180101 = new Date(2018, 0, 1);
    let nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    let start = _20180101;

    let rs = await query.sql(connection, `select id from users where isDeleted = 0`);
    
    console.log('===> 开始创建18年1月至今的统计表数据\n');
    while (start < nextWeek) {
      let startTime = Date.getWeekStart(start).format('yyyy-MM-dd hh:mm:ss');
      let endTime = Date.getWeekEnd(start).format('yyyy-MM-dd hh:mm:ss');

      let data = rs.map(temp => `(${temp.id}, '${startTime}', '${endTime}')`);

      await query.sql(connection, `insert into statistics (userId, startTime, endTime) values ${data.join(' , ')}`);

      start.setDate(start.getDate() + 7);
    }

    console.log('===> 开始创建当月日报表\n');    
    let thisMonth = new Date().format('yyyyMM');

    await query.sql(connection, `CREATE TABLE IF NOT EXISTS daily_${thisMonth} LIKE daily_tpl`);
    await query.sql(connection, `CREATE TABLE IF NOT EXISTS daily_events_${thisMonth} LIKE daily_events_tpl`);


    connection.end();
    console.log('===> 结束初始化');
  } catch (err) {
    console.error('脚本异常: ', err);
  }
}

init();