
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');


async function getTable(req, res, next) {
  let date = +req.params.date || new Date();

  date = new Date(date);
  date.setHours(8);
  let weekCount = Date.getWeekCountOfMonth(date);  //  一个月有多少个星期

  //  计算出一个月的开始和结束日期
  let monthStart = Date.getFirstMonday(date);
  let tempDate = new Date(monthStart);
  let monthEnd = Date.getWeekEnd(tempDate.setDate(tempDate.getDate() + (weekCount - 1) * 7));
  let monthStartStr = monthStart.format('yyyy-MM-dd hh:mm:ss');
  let monthEndStr = monthEnd.format('yyyy-MM-dd hh:mm:ss');


  let connection;
  try {
    connection = createConnection();


    //  查找这个月的所有项目
    let allProjects = await query.sql(connection,
      `SELECT id, name FROM projects WHERE isDeleted = 0 AND 
    id IN (SELECT projectId FROM events WHERE isDeleted = 0 AND 
    startTime BETWEEN '${monthStartStr}' AND '${monthEndStr}' 
    AND endTime BETWEEN '${monthStartStr}' AND '${monthEndStr}')`);

    let headers = [
      {
        prop: 'username',
        label: '用户名',
      }
    ];
    for (let { id, name } of allProjects) {
      headers.push({
        label: name,
        sub: [
          {
            label: '总实际',
            prop: `real_${id}`
          },
          {
            label: '总核准',
            prop: `approval_${id}`,
          },
          {
            label: '总核准2',
            prop: `approval2_${id}`
          }
        ]
      });
    }
    headers.push({
      label: '全部项目',
      sub: [
        {
          label: '总可用',
          prop: 'totalAvaTime'
        },
        {
          label: '总计划',
          prop: 'totalPlanTime'
        },
        {
          label: '总实际',
          prop: 'totalRealTime',
        },
        {
          label: '总核准',
          prop: 'totalApproval',
        },
        {
          label: '总核准2',
          prop: 'totalApproval2'
        },
        {
          label: '总核准2 / 总可用 (%)',
          prop: 'approval2DivAva',
        },
        {
          label: '总计划 / 总可用 (%)',
          prop: 'planDivAva'
        }
      ]
    })

    let rows = [];
    const SUM_REALTIME = 'SUM(realTime)';
    const SUM_APPROVAL = 'SUM(approval)';
    const SUM_PLANTIME = 'SUM(planTime)';
    const SUM_AVATIME = 'SUM(avaTime)';
    let users = await query.sql(connection,
      `SELECT id AS userId, username, depName FROM users WHERE (isDeleted = 0 OR deletedAt > '${monthStartStr}') AND id <> 0`);

    for (let { userId, username, depName } of users) {

      //  一个月的实际之和
      let rs = (await query.sql(connection,
        `SELECT ${SUM_REALTIME}, ${SUM_APPROVAL}, ${SUM_PLANTIME}, ${SUM_AVATIME} FROM statistics WHERE userId = ${userId} AND 
        startTime BETWEEN '${monthStartStr}' AND '${monthEndStr}' AND 
        endTime BETWEEN '${monthStartStr}' AND '${monthEndStr}'`))[0];

      let totalRealTime = 0, totalApproval = 0, totalPlanTime = 0, totalAvaTime = 0;
      if (rs) {
        totalRealTime = rs[SUM_REALTIME];
        totalApproval = rs[SUM_APPROVAL];
        totalPlanTime = rs[SUM_PLANTIME];
        totalAvaTime = rs[SUM_AVATIME];
      }

      //  找出该用户这个月参与过的项目
      let projects = await query.sql(connection,
        `SELECT projectId FROM users_projects WHERE userId = ${userId}`);
      projects = projects.map(({ projectId }) => projectId);
      let temp = allProjects.map(({ id }) => id);
      projects = Array.same(temp, projects);

      //  汇总每月在该项目上花费的 实际时间/核准时间 总和
      let cols = {};
      let totalApproval2 = 0;
      for (let projectId of projects) {
        let sql = `SELECT ${SUM_REALTIME}, ${SUM_APPROVAL} FROM events WHERE projectId = ${projectId} AND isDeleted = 0  
          AND startTime BETWEEN '${monthStartStr}' AND '${monthEndStr}'
          AND endTime BETWEEN '${monthStartStr}' AND '${monthEndStr}'
          AND id IN (SELECT eventId FROM users_events WHERE userId = ${userId})`;

        let rs = (await query.sql(connection, sql))[0];
        let real = 0, approval = 0;
        if (rs) {
          real = rs[SUM_REALTIME] || 0;
          approval = rs[SUM_APPROVAL] || 0;
        }

        //  计算核准2
        rs = (await query.sql(connection,
          `SELECT ratio FROM evaluation WHERE projectId = ${projectId} AND date = '${monthStartStr}'`))[0];
        let ratio = 0;
        if (rs) {
          ratio = rs.ratio;
        }

        let approval2 = +(approval * ratio).toFixed(3);

        //  总核准2
        totalApproval2 += approval2;

        Object.assign(cols, {
          [`real_${projectId}`]: real,
          [`approval_${projectId}`]: approval,
          [`approval2_${projectId}`]: approval2,
        });
      }

      let approval2DivAva = 0;
      let planDivAva = 0;
      if (totalAvaTime && totalAvaTime !== 0) {
        approval2DivAva = `${(totalApproval2 / totalAvaTime * 100).toFixed(3)} %`;
         planDivAva = `${(totalPlanTime / totalAvaTime * 100).toFixed(3)} %`;
      }
      rows.push({
        username,
        ...cols,
        totalAvaTime,
        totalPlanTime,
        totalRealTime,
        totalApproval,
        totalApproval2,
        approval2DivAva,
        planDivAva
      });
    }
    res.status(200).json({
      headers,
      rows
    });

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = {
  getTable
};