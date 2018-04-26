let query = require('./utils/query');
let createConnection = require('./utils/create-connection');
require('./utils/date');

async function init() {
  console.log('===> 修复日报内容格式\n');
  try {
    let connection = createConnection();

    let rs = await query.sql(connection,
      `SELECT dailyId, content FROM daily_201804`);

    for (let { dailyId, content } of rs) {
      content = content.replace(/<h2>.+<\/h2>/, '');
      content = content.replace(/<[^>]+>/g, '\n');

      await query.sql(connection, 
        `UPDATE daily_201804 SET content = '${content}' WHERE dailyId = ${dailyId}`);
    }

    connection.end();
    console.log('===> 完成');
  } catch (err) {
    console.error('脚本异常: ', err);
  }
}

init();