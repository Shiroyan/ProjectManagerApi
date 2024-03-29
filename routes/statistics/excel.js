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
const REAL = 'real';
const PLAN = 'plan';
const EXCELLENT = 1.2;
const BAD = 0.8;
const BUSY = 8;
const FREE = -8;

fs.existsSync(REPORT_PATH) || fs.mkdirSync(REPORT_PATH);

async function getDownloadUrl(req, res, next) {
  let type = req.query.type || PLAN;
  let date = new Date();
  if (type === REAL) {
    date.setDate(date.getDate() - 7); //  退回到上个星期
  }
  let startTime = req.query.startTime || Date.getWeekStart(date).format('yyyy-MM-dd');
  let endTime = req.query.endTime || Date.getWeekEnd(date).format('yyyy-MM-dd');

  //#region 检验日期是否在同一周、相差是否超过7天
  let error = type === REAL ?
    Date.inAWeek(startTime, endTime, 'real') : Date.inAWeek(startTime, endTime);
  if (error) {
    return next(error);
  }
  //#endregion

  let baseUrl = req.headers.host;
  let { protocol } = req;
  // return url
  res.status(200).json({
    url: `${protocol}://${baseUrl}/statistics/excel/${type}?startTime=${startTime}&endTime=${endTime}`
  });
}


//  保留2位小数
function getRounding(num) {
  return +num.toFixed(2);
}

async function genExcel(req, res, next) {
  let { path } = req;
  let date = new Date();
  let type = '计划';
  if (path.has(REAL)) {
    date.setDate(date.getDate() - 7); //  退回到上个星期
    type = '实际';
  }

  let startTime = req.query.startTime || date;
  let endTime = req.query.endTime || date;

  startTime = Date.getWeekStart(startTime).format('yyyy-MM-dd hh:mm:ss');
  endTime = Date.getWeekEnd(endTime).format('yyyy-MM-dd hh:mm:ss');

  //#region 检验日期是否在同一周、相差是否超过7天
  let error = path.has(REAL) ?
    Date.inAWeek(startTime, endTime, 'real') : Date.inAWeek(startTime, endTime);
  if (error) {
    return next(error);
  }
  //#endregion

  let begin = new Date(startTime).format('yyyyMMdd');
  let end = new Date(endTime).format('yyyyMMdd');
  let filename = `${REPORT_PATH}/${begin}-${end}项目人员计划执行汇总表(${type}).xlsx`;

  let workBook = new Excel.Workbook();
  workBook.creator = 'admin';
  workBook.created = new Date();

  let all = workBook.addWorksheet('计划-执行-核准');
  let analysis = workBook.addWorksheet('人力分析');

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

  //#region 设置 “计划-执行-核准” 表头
  let header = [
    { header: '序号', key: 'index' },
    { header: '城市', key: 'city' },
    { header: '部门', key: 'dep', width: 20 },
    { header: '岗位类型', key: 'job', width: 10 },
    { header: '姓名', key: 'username', width: 15 },
    { header: '可用', key: 'avaTime' },
    { header: '计划', key: 'planTime' },
    { header: '实际', key: 'realTime' },
    { header: '核准', key: 'approval' },
    { header: '计划-可用', key: 'busyTime', width: 14 },
    { header: '实际-计划', key: 'planOffset', width: 14 },
    { header: '实际-可用', key: 'realOffset', width: 14 },
    { header: '实际-可用(上周)', key: 'lRealOffset', width: 14 },
    { header: '核准/实际', key: 'effect', width: 14 },
    { header: '核准/实际(上周)', key: 'lEffect', width: 14 },
    { header: '忙闲持续周数(忙+、闲-)', key: 'busyCnt', width: 20 },
    { header: '优差持续周数(差+、优-)', key: 'badCnt', width: 20 },
  ];
  all.columns = header;
  //#endregion

  //#region 设置 "人力分析表头"
  analysis.mergeCells('A1:H1');
  let title = analysis.getCell('A1');
  title.value = '人力计划-使用-考核分（岗位、部门、城市）分析表';
  title.font = { size: 14, bold: true };
  title.alignment = alignmentStyle;
  //#endregion

  let connection;
  try {
    connection = createConnection();


    //#region 填充 "计划-执行-核准" Sheet数据
    let sql = `SELECT DISTINCT
    users.id,
    users.username,
    users.depId,
    users.depName,
    users.jobId,
    users.jobName,
    users.cityId,
    users.cityName,
    statistics.avaTime,
    statistics.planTime,
    statistics.realTime,
    statistics.approval,
    statistics.busyTime,
    statistics.effect,
    statistics.planOffset,
    statistics.realOffset
  FROM users, statistics 
  WHERE (users.id = statistics.userId AND users.id <> 0 AND (users.isDeleted = 0 OR users.deletedAt > '${startTime}'))
  AND ('${startTime}' BETWEEN statistics.startTime AND statistics.endTime 
    AND '${endTime}' BETWEEN statistics.startTime AND statistics.endTime)`;

    //  定义上周时间
    let lastWeek = new Date(startTime);
    lastWeek.setDate(lastWeek.getDate() - 7);
    let lStartTime = Date.getWeekStart(lastWeek).format('yyyy-MM-dd hh:mm:ss');
    let lEndTime = Date.getWeekEnd(lastWeek).format('yyyy-MM-dd hh:mm:ss');

    let rs = await query.sql(connection, sql);
    for (let [index, temp] of rs.entries()) {
      let { id, username, avaTime, planTime, realTime,
        approval, busyTime, effect, planOffset, realOffset } = temp;
      let dep = temp.depName,
        job = temp.jobName,
        city = temp.cityName;
      let lRealOffset = 0,
        lEffect = 0,
        badCnt = 0,
        busyCnt = 0;

      //  上周 实际偏差值 效率
      let rs2 = await query.sql(connection,
        `SELECT realOffset, effect FROM statistics WHERE userId = ${id} AND 
        ('${lStartTime}' BETWEEN startTime AND endTime AND '${lEndTime}' BETWEEN startTime AND endTime)`);
      if (rs2.length > 0) {
        lRealOffset = rs2[0].realOffset;
        lEffect = rs2[0].effect;
      }

      //#region 统计忙闲持续、优差持续
      sql = `SELECT busyTime, effect FROM statistics WHERE userId = ${id} 
    AND endTime <= '${endTime}'`;
      rs2 = await query.sql(connection, sql);
      let len = rs2.length;
      for (let i = 0; i < len - 1; i++) {
        let lastWeek = rs[i],
          thisWeek = rs[i + 1];
        let lEff = lastWeek.effect,
          lBusyTime = lastWeek.busyTime,
          tEff = thisWeek.effect,
          tBusyTime = thisWeek.busyTime;

        if (lEff >= EXCELLENT && tEff >= EXCELLENT) {
          badCnt--;
        } else if (lEff <= BAD && tEff <= BAD) {
          badCnt++;
        } else {
          badCnt = 0;
        }

        if (lBusyTime >= BUSY && tBusyTime >= BUSY) {
          busyCnt++;
        } else if (lBusyTime <= FREE && tBusyTime <= FREE) {
          busyCnt--;
        } else {
          busyCnt = 0;
        }
      }

      //#endregion

      all.addRow({
        index, city, dep, job, username, avaTime, planTime, realTime,
        approval, busyTime, effect, planOffset, realOffset, lRealOffset, lEffect, busyCnt, badCnt
      });
    }
    //#endregion

    //#region 筛选出产品部门id
    sql = 'SELECT id FROM departments WHERE name LIKE \'%产品%\'';
    let productIds = await query.sql(connection, sql) || [];
    productIds = productIds.map(temp => temp.id);
    //#endregion

    //#region 填充 "人力分析" Sheet数据
    let divideByCity = new Map(); //  按城市划分
    let divideByCity2 = new Map(); //  按城市划分- 除去产品部
    let divideByDep = new Map();  //  按部门划分
    let divideByJob = new Map();  //  按岗位划分
    rs.length > 0 && rs.forEach((temp, index) => {
      let { cityId, cityName, depId, depName, jobId,
        jobName, avaTime, planTime, realTime, approval, } = temp;
      let dep = temp.depName,
        job = temp.jobName,
        city = temp.cityName;

      let data = divideByCity.get(cityId);
      if (data) {
        data.avaTime += avaTime;
        data.planTime += planTime;
        data.realTime += realTime;
        data.approval += approval;
        data.cnt++;
      } else {
        divideByCity.set(cityId, { cityName, avaTime, planTime, realTime, approval, cnt: 1 });
      }

      data = divideByDep.get(depId);
      if (data) {
        data.avaTime += avaTime;
        data.planTime += planTime;
        data.realTime += realTime;
        data.approval += approval;
        data.cnt++;
      } else {
        divideByDep.set(depId, { depName, avaTime, planTime, realTime, approval, cnt: 1 });
      }

      data = divideByJob.get(jobId);
      if (data) {
        data.avaTime += avaTime;
        data.planTime += planTime;
        data.realTime += realTime;
        data.approval += approval;
        data.cnt++;
      } else {
        divideByJob.set(jobId, { jobName, avaTime, planTime, realTime, approval, cnt: 1 });
      }

      if (!productIds.includes(depId)) {
        data = divideByCity2.get(cityId);
        if (data) {
          data.avaTime += avaTime;
          data.planTime += planTime;
          data.realTime += realTime;
          data.approval += approval;
          data.cnt++;
        } else {
          divideByCity2.set(cityId, { cityName, avaTime, planTime, realTime, approval, cnt: 1 });
        }
      }

    })

    //  按岗位
    analysis.addRows([
      [], //  空行
      ['岗位类型', '人数', '总可用时间', '总计划时间', '总实际投入时间', '总核准投入时间', '总计划时间/总可用时间(%)', '总核准时间/总可用时间(%)']
    ]);
    for (let [key, o] of divideByJob) {
      analysis.addRow([o.jobName, o.cnt, o.avaTime, o.planTime, o.realTime, o.approval,
      `${getRounding(o.planTime / o.avaTime * 100)}%`, `${getRounding(o.approval / o.avaTime * 100)}%`]);
    }

    //  按部门
    analysis.addRows([
      [], [],
      ['部门', '人数', '总可用时间', '总计划时间', '总实际投入时间', '总核准投入时间', '总计划时间/总可用时间(%)', '总核准时间/总可用时间(%)']
    ]);
    for (let [key, o] of divideByDep) {
      analysis.addRow([o.depName, o.cnt, o.avaTime, o.planTime, o.realTime, o.approval,
      `${getRounding(o.planTime / o.avaTime * 100)}%`, `${getRounding(o.approval / o.avaTime * 100)}%`]);
    }

    //  按城市
    let total = {
      name: '总计',
      cnt: 0,
      avaTime: 0,
      planTime: 0,
      realTime: 0,
      approval: 0
    };
    analysis.addRows([
      [], [],
      ['城市', '人数', '总可用时间', '总计划时间', '总实际投入时间', '总核准投入时间', '总计划时间/总可用时间(%)', '总核准时间/总可用时间(%)']
    ]);
    for (let [key, o] of divideByCity) {
      analysis.addRow([o.cityName, o.cnt, o.avaTime, o.planTime, o.realTime, o.approval,
      `${getRounding(o.planTime / o.avaTime * 100)}%`, `${getRounding(o.approval / o.avaTime * 100)}%`]);
      total.cnt += o.cnt;
      total.avaTime += o.avaTime;
      total.planTime += o.planTime;
      total.realTime += o.realTime;
      total.approval += o.approval;
    }
    analysis.addRow([total.name, total.cnt, total.avaTime, total.planTime, total.realTime, total.approval,
    `${getRounding(total.planTime / total.avaTime * 100)}%`, `${getRounding(total.approval / total.avaTime * 100)}%`]);

    //  按城市 - 除去产品部   
    total = {
      name: '总计',
      cnt: 0,
      avaTime: 0,
      planTime: 0,
      realTime: 0,
      approval: 0
    };
    analysis.addRows([
      [], [], ['除产品'],
      ['城市', '人数', '总可用时间', '总计划时间', '总实际投入时间', '总核准投入时间', '总计划时间/总可用时间(%)', '总核准时间/总可用时间(%)']
    ]);
    for (let [key, o] of divideByCity2) {
      analysis.addRow([o.cityName, o.cnt, o.avaTime, o.planTime, o.realTime, o.approval,
      `${getRounding(o.planTime / o.avaTime * 100)}%`, `${getRounding(o.approval / o.avaTime * 100)}%`]);
      total.cnt += o.cnt;
      total.avaTime += o.avaTime;
      total.planTime += o.planTime;
      total.realTime += o.realTime;
      total.approval += o.approval;
    }
    analysis.addRow([total.name, total.cnt, total.avaTime, total.planTime, total.realTime, total.approval,
    `${getRounding(total.planTime / total.avaTime * 100)}%`, `${getRounding(total.approval / total.avaTime * 100)}%`]);
    //#endregion

    //#region 调整Excel格式
    //#region 表1
    let rowCnt = all.actualRowCount;
    all.getRow(1).font = headerFontStyle;
    all.getRow(1).alignment = alignmentStyle;
    for (let i = 2; i <= rowCnt; i++) {
      let row = all.getRow(i);
      row.alignment = alignmentStyle;

      let planOffset = row.getCell('planOffset'); //  实际-计划
      let realOffset = row.getCell('realOffset'); //  实际-可用
      let busyTime = row.getCell('busyTime');     //  计划-可用
      let effect = row.getCell('effect');         //  核准/实际

      for (let o of [planOffset, realOffset, busyTime]) {
        if (o.value >= 8) {
          o.font = greenFontStyle;
          o.fill = greenFillStyle;
        } else if (o.value <= -8) {
          o.font = redFontStyle;
          o.fill = redFillStyle;
        }
      }
      if (effect.value >= 1.2) {
        effect.font = greenFontStyle;
        effect.fill = greenFillStyle;
      } else if (effect.value <= 0.8) {
        effect.font = redFontStyle;
        effect.fill = redFillStyle;
      }
    }
    //#endregion
    //#region 表2
    for (let i = 3; i <= 8; i++) {
      let col = analysis.getColumn(i);
      col.alignment = alignmentStyle;
      (i >= 3) && (analysis.getColumn(i).width = 25);
    }
    rowCnt = analysis.rowCount;
    for (let i = 2; i <= rowCnt; i++) {
      let row = analysis.getRow(i);
      let values = row.values;
      if (Array.isArray(values) && values.length > 0) {
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });
      }
    }

    //#endregion
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
  genExcel,
  getDownloadUrl,
};
