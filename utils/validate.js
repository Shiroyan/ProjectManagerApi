

/**
 * 验证请求参数是否满足格式要求
 */

function num(min, max) {
  return {
    type: 'number',
    min,
    max
  };
}
function str(min, max) {
  return {
    type: 'string',
    min,
    max
  };
}
let date = { type: 'date' };
let pwd = str(6, 12);

const FORMAT = {
  account: str(5, 12),
  password: pwd,
  oldPwd: pwd,
  newPwd: pwd,
  username: str(1, 12),
  city: num(0, 1),
  dep: num(1, 9),
  job: num(1, 15),
  role: num(1, Number.MAX_SAFE_INTEGER),
  uid: num(0, Number.MAX_SAFE_INTEGER),
  projectId: num(0, Number.MAX_SAFE_INTEGER),
  eventId: num(0, Number.MAX_SAFE_INTEGER),
  projectName: str(3, 12),
  firstParty: str(2, 20),
  members: { type: 'Array<number>' },
  tags: { type: 'Array<number>' },
  startTime: date,
  endTime: date,
  planTime: num(0, 200),
  realTime: num(0, 200),
  stageId: num(0, 11),
  contractVal: num(0, 1000000),
  process: num(0, 100),
  planId: num(0, Number.MAX_SAFE_INTEGER),
  planName: str(3, 12),
  isFinished: num(0, 1),
  ratio: num(0, 2),
  approval: num(0, 200),
  desc: str(1, 200),
  tagName: str(0,7),
  year: str(4,4),
  month: str(2,2)
}


/**
 * 校验参数类型、格式是否合乎要求
 * @param {Map} map 需要进行类型校验的Map
 * 
 * 返回：
 * 正确     -0
 * 参数缺失 -1
 * 类型错误 -2
 * 格式错误 -3
 */
function validate(map) {
  for (let [key, val] of map) {
    let f = FORMAT[key];

    if (val === undefined) {
      return new ResponseError('缺少参数/非法的参数', 406);
    }

    switch (f.type) {
      case 'string':
        if (typeof val !== f.type) {
          return new ResponseError('参数类型不符合', 406);
        }
        if (val.length < f.min || val.length > f.max) {
          return new ResponseError('格式错误', 406);
        }
        break;
      case 'number':
        if (Number.isNaN(val)) {
          return new ResponseError('缺少参数/非法的参数', 406);
        }
        if (typeof val !== f.type) {
          return new ResponseError('参数类型不符合', 406);
        }
        if (val < f.min || val > f.max) {
          return new ResponseError('格式错误', 406);
        }
        break;
      case 'Array<number>':
        if (Array.isArray(val) && val.length !== 0) {
          let isAllNumber = val.every(val => {
            return typeof val === 'number';
          });
          if (!isAllNumber) {
            return new ResponseError('参数类型不符合', 406);
          }
        } else {
          return new ResponseError('缺少参数/非法的参数', 406);
        }
        break;
      case 'date':
        if (!Date.isDate(val)) {
          return new ResponseError('格式错误', 406);
        }
        break;
    }
  }
}

module.exports = validate;