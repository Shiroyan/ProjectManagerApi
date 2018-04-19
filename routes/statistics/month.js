let fs = require('fs');
let Excel = require('exceljs');
let createConnection = require('../../utils/create-connection');
let query = require('../../utils/query');
let validate = require('../../utils/validate');

const REPORT_PATH = '/temp';
const GREEN_BG = 'FFC6EFCE';
const GREEN_FONT = 'FF008000';
const RED_BG = 'FFFFC0CB';
const RED_FONT = 'FFFF0000';

fs.existsSync(REPORT_PATH) || fs.mkdirSync(REPORT_PATH);

async function getMonthReportUrl(req, res, next) {
  let date = req.query.date;
  let baseUrl = req.headers.host;
  let { protocol } = req;
  // return url
  res.status(200).json({
    url: `${protocol}://${baseUrl}/statistics/excel/monthreport?date=${date}`
  });
}


function getFirstMonday(date) {
  date = new Date(date);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getWeekCountOfMonth(date) {
  date = new Date(date);
  let thisMonth = date.getMonth();
  let firstMonday = getFirstMonday(date);
  let count = 0;
  while (firstMonday.getMonth() === thisMonth) {
    count++;
    firstMonday.setDate(firstMonday.getDate() + 7);
  }
  return count;
}

async function genExcelMonthly(req, res, next) {
  let { path } = req;
  let reportDate = req.query.date || new Date();

  reportDate = new Date(reportDate);
  let weekCount = getWeekCountOfMonth(reportDate);  //  一个月有多少个星期

  //  计算出一个月的开始和结束日期
  let monthStart = getFirstMonday(reportDate);
  let tempDate = new Date(monthStart);
  let monthEnd = Date.getWeekEnd(tempDate.setDate(tempDate.getDate() + (weekCount - 1) * 7));
  let monthStartStr = monthStart.format('yyyy-MM-dd hh:mm:ss');
  let monthEndStr = monthEnd.format('yyyy-MM-dd hh:mm:ss');

  //  每个星期的起止时间, yyyy-MM-dd hh:mm:ss 格式 和 MM月dd日 格式
  let weeks = [];

  for (let i = 0; i < weekCount; ++i) {
    let temp = new Date(monthStart);
    temp.setDate(temp.getDate() + 7 * i);
    let startTime = Date.getWeekStart(temp);
    let endTime = Date.getWeekEnd(temp);
    weeks.push({
      startTime: startTime.format('yyyy-MM-dd hh:mm:ss'),
      endTime: endTime.format('yyyy-MM-dd hh:mm:ss'),
      startMD: startTime.format('MM月dd日'),
      endMD: endTime.format('MM月dd日')
    });
  }

  let workBook = new Excel.Workbook();
  workBook.creator = 'admin';
  workBook.created = new Date();
  let filename = `${REPORT_PATH}/${reportDate.format('yyyyMM')}汇总.xlsx`;


  let all = workBook.addWorksheet('Sheet1');

  fs.existsSync(REPORT_PATH) || fs.mkdirSync(REPORT_PATH);

  //#region 格式
  let headerFontStyle = {
    bold: true
  };
  let redFontStyle = {
    bold: true,
    color: {
      argb: RED_FONT
    }
  };
  let greenFontStyle = {
    bold: true,
    color: {
      argb: GREEN_FONT
    }
  };
  let redFillStyle = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: RED_BG }
  };
  let greenFillStyle = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: GREEN_BG }
  };
  let alignmentStyle = {
    horizontal: 'center'
  }
  let borderStyle = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  }
  //#endregion


  let connection;
  try {
    connection = createConnection();
    
    //#region 设置表头
    let header = [
      { header: '序号', key: 'userId' },
      { header: '部门', key: 'dep', width: 20 },
      { header: '姓名', key: 'username', width: 15 },
      { header: '总实际时间', key: 'totalRealTime', width: 20 },
      { header: '总核准时间', key: 'totalApprovalTime', width: 20 },
    ];
    all.columns = header;

    let step = weekCount + 3;
    let colStart = header.length + 1;
    //  查找这个月的所有项目
    let allProjects = await query.sql(connection,
      `SELECT id, name FROM projects WHERE isDeleted = 0 AND 
    id IN (SELECT projectId FROM events WHERE isDeleted = 0 AND 
    startTime BETWEEN '${monthStartStr}' AND '${monthEndStr}' 
    AND endTime BETWEEN '${monthStartStr}' AND '${monthEndStr}')`);

    for (let { id, name } of allProjects) {

      //#region 设置项目名表头
      all.mergeCells(1, colStart, 1, colStart + weekCount - 1);
      let projectNameCol = all.getColumn(colStart);
      let projectNameCell = all.getRow(1).getCell(colStart);
      projectNameCell.value = name;
      projectNameCell.font = { size: 14, bold: true };
      projectNameCell.alignment = alignmentStyle;
      //#endregion

      //#region 设置项目下的日期区间
      for (let i = 0; i < weeks.length; ++i) {
        let col = all.getColumn(colStart + i);
        col.width = 20;
        //  采用 projectId_weekIndex作为key值
        col.key = `${id}_${i}`;
        let secondRow = all.getRow(2).getCell(colStart + i);
        secondRow.value = `${weeks[i].startMD}-${weeks[i].endMD}`;
      }
      //#endregion

      //#region 设置合计、占比列
      let total = all.getColumn(colStart + weekCount);
      let percent = all.getColumn(colStart + weekCount + 1);
      total.key = `${id}_total`;
      percent.key = `${id}_percent`;
      all.getRow(1).getCell(colStart + weekCount).value = '合计（h）';
      all.getRow(1).getCell(colStart + weekCount + 1).value = '占比';
      all.getRow(1).getCell(colStart + weekCount + 2).value = '工资分摊（工作量）';
      //#endregion
      colStart += step;
    }
    //#endregion

    //#region 填充数据
    let rowStart = 3;
    const SUM_REALTIME = 'SUM(realTime)';
    const SUM_APPROVAL = 'SUM(approval)';
    let users = await query.sql(connection,
      `SELECT id AS userId, username, depName FROM users WHERE (isDeleted = 0 OR deletedAt > '${monthStartStr}') AND id <> 0`);
    for (let { userId, username, depName } of users) {

      //  一个月的实际之和
      let rs = await query.sql(connection,
        `SELECT ${SUM_REALTIME}, ${SUM_APPROVAL} FROM statistics WHERE userId = ${userId} AND 
        startTime BETWEEN '${monthStartStr}' AND '${monthEndStr}' AND 
        endTime BETWEEN '${monthStartStr}' AND '${monthEndStr}'`);

      let totalRealTime = 0, totalApprovalTime = 0;
      if (rs[0]) {
        totalRealTime = rs[0][`${SUM_REALTIME}`];
        totalApprovalTime = rs[0][`${SUM_APPROVAL}`];
      }
      
      //  找出该用户这个月参与过的项目
      let projects = await query.sql(connection,
        `SELECT projectId FROM users_projects WHERE userId = ${userId}`);
      projects = projects.map(({ projectId }) => projectId);
      let temp = allProjects.map(({ id }) => id);
      projects = Array.same(temp, projects);

      //  汇总每周在该项目上花费的实际时间总和
      let realTimeMap = {};
      for (let projectId of projects) {
        let monthSum = 0;
        for (let i = 0; i < weeks.length; ++i) {
          let sql = `SELECT ${SUM_REALTIME} FROM events WHERE projectId = ${projectId} AND isDeleted = 0  
          AND startTime BETWEEN '${weeks[i].startTime}' AND '${weeks[i].endTime}'
          AND endTime BETWEEN '${weeks[i].startTime}' AND '${weeks[i].endTime}'
          AND id IN (SELECT eventId FROM users_events WHERE userId = ${userId})`;
          let weekRealTime = await query.sql(connection, sql);

          if (weekRealTime[0] && weekRealTime[0][`${SUM_REALTIME}`]) {
            weekRealTime = weekRealTime[0][`${SUM_REALTIME}`];
          } else {
            weekRealTime = '-';
          }

          realTimeMap[`${projectId}_${i}`] = weekRealTime;
          if (typeof weekRealTime === 'number') {
            monthSum += weekRealTime;
          }
        }
        realTimeMap[`${projectId}_total`] = monthSum === 0 ? '-' : monthSum;
        realTimeMap[`${projectId}_percent`] = totalRealTime === 0 ? 0 : `${(monthSum / totalRealTime * 100).toFixed(3)}%`;
      }

      all.addRow({
        userId,
        username,
        dep: depName,
        totalRealTime,
        totalApprovalTime,
        ...realTimeMap,
      });
    }
    //#endregion

    await workBook.xlsx.writeFile(filename);

    res.download(filename);

  } catch (err) {
    next(err);
  } finally {
    connection && connection.end();
  }
}

module.exports = {
  genExcelMonthly,
  getMonthReportUrl,
};