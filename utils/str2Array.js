module.exports = (() => {
  /** 
   * 把类数组字符串转化成数组
   * 类数组字符串形如'2,3,4'
  */
  String.prototype.toArray = function () {
    let arr = this.split(',');
    arr = arr.map(val => +val);
    arr = arr.filter(val => {
      return (typeof val === 'number' && val !== 0 && !Number.isNaN(val));
    });
    return arr;
  }
  String.prototype.has = function (str) {
    return (this.indexOf(str) !== -1)
  }
  //  对 ' " 进行转义
  String.prototype.transfer = function() {
    let temp = this;
    let reg1 = /'+/g;
    // let reg2 = /"+/g;
    temp = temp.replace(reg1, '\\\'');
    // temp = temp.replace(reg2, '\\\"');
    return temp;
  }

})();