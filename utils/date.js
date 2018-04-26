module.exports = (function () {
  Date.prototype.format = function (fmt) {
    var o = {
      "M+": this.getMonth() + 1,                 //月份 
      "d+": this.getDate(),                    //日 
      "h+": this.getHours(),                   //小时 
      "m+": this.getMinutes(),                 //分 
      "s+": this.getSeconds(),                 //秒 
      "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
      "S": this.getMilliseconds()             //毫秒 
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
      }
    }
    return fmt;
  }

  Date.isDate = function (str) {
    var reg = /^(\d+)-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;
    var r = str.match(reg);
    if (r == null) return false;
    r[2] = r[2] - 1;
    var d = new Date(r[1], r[2], r[3], r[4], r[5], r[6]);
    if (d.getFullYear() != r[1]) return false;
    if (d.getMonth() != r[2]) return false;
    if (d.getDate() != r[3]) return false;
    if (d.getHours() != r[4]) return false;
    if (d.getMinutes() != r[5]) return false;
    if (d.getSeconds() != r[6]) return false;
    return d;
  }

  Date.getWeekStart = (date) => {
    let nowDate = date ? new Date(date) : new Date();
    let dayOfWeek = nowDate.getDay() || 7;
    let dayOfMon = nowDate.getDate();
    nowDate.setDate(dayOfMon - dayOfWeek + 1);
    nowDate.setHours(0);
    nowDate.setMinutes(0);
    nowDate.setSeconds(0);
    nowDate.setMilliseconds(0);
    return nowDate;
  }

  Date.getWeekEnd = (date) => {
    let nowDate = date ? new Date(date) : new Date();
    let dayOfWeek = nowDate.getDay() || 7;
    let dayOfMon = nowDate.getDate();
    nowDate.setDate(dayOfMon + (7 - dayOfWeek));
    nowDate.setHours(23);
    nowDate.setMinutes(59);
    nowDate.setSeconds(59);
    nowDate.setMilliseconds(999);
    return nowDate;
  }

  /**
   * 
   * @param {string} start  开始时间 YYYY-MM-dd
   * @param {string} end    结束时间 YYYY-MM-dd
   * @param {string} type   判断方法 'plan' - 不得超过今周 
   *                                'real' - 不得超过上周
   */
  Date.inAWeek = (start, end, type = 'plan') => {
    let sDate = new Date(start);
    let bDate = new Date(end);
    //  开始时间与结束时间的大小判断
    if (sDate > bDate) {
      return new ResponseError('结束时间不得小于开始时间', 406);
    }
    //  “计划” 时间不得超过下周
    if (type === 'plan') {
      let nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      let thisWeekStart = Date.getWeekStart(nextWeek);
      let thisWeekEnd = Date.getWeekEnd(nextWeek);
      if (bDate > thisWeekEnd) {
        return new ResponseError('结束时间不得大于下周周日', 406);
      }

    } else if (type === 'real') {
      //  “实际” 时间不得超过当周
      let date = new Date();
      // date.setDate(date.getDate() - 7); //  上周日期
      let lastWeekStart = Date.getWeekStart(date);
      let lastWeekEnd = Date.getWeekEnd(date);
      if (bDate > lastWeekEnd) {
        return new ResponseError('结束时间不得大于当周周日', 406);
      }
    }
    //  校验开始、结束时间是否在同一周内
    let monday = Date.getWeekStart(sDate),
      sunday = Date.getWeekEnd(sDate);
    if (!((sDate >= monday && sDate <= sunday)
      && (bDate >= monday && bDate <= sunday))) {
      return new ResponseError('请确保起止日期都在同个星期', 406);
    }
  }
  Date.getFirstMonday = (date) => {
    date = new Date(date);
    while (date.getDay() !== 1) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  Date.getWeekCountOfMonth = (date) => {
    date = new Date(date);
    let thisMonth = date.getMonth();
    let firstMonday = Date.getFirstMonday(date);
    let count = 0;
    while (firstMonday.getMonth() === thisMonth) {
      count++;
      firstMonday.setDate(firstMonday.getDate() + 7);
    }
    return count;
  }
})();