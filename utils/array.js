
module.exports = (function () {
  /**
   * 查找出arr1 不同于 arr2的数据
   * @param {Array} arr1 
   * @param {Array} arr2 
   */
  Array.differ = function (arr1, arr2) {
    return arr1.filter(val => !arr2.includes(val));
  }
})();