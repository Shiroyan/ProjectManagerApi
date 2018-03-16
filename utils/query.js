let mysql = require('mysql');

module.exports = {
  one(connection, col, table, condName, condVal) {
    return new Promise((resolve, reject) => {
      let format = 'select ?? from ?? where ?? = ?';
      let sql = mysql.format(format, [col, table, condName, condVal]);
      connection.query(sql, (err, rs, fields) => {
        err ? reject(err) : resolve(rs);
      })
    })
  },
  all(connection, table, condName, condVal) {
    return new Promise((resolve, reject) => {
      let format, sql;
      if (condName && condVal) {
        format = 'select distinct * from ?? where ?? = ?';
        sql = mysql.format(format, [table, condName, condVal]);
      } else {
        sql = `select * from ${table}`;
      }
      connection.query(sql, (err, rs, fields) => {
        err ? reject(err) : resolve(rs);
      })
    })
  },
  multi(connection, sqls) {
    return new Promise((resolve, reject) => {
      let sql = sqls.join(';');
      connection.query(sql, (err, rs, fields) => {
        err ? reject(err) : resolve(rs);
      });
    });
  },
  insert(connection, table, data) {
    return new Promise((resolve, reject) => {
      let sql = `insert into ${table} set ?`;
      connection.query(sql, data, (err, rs, fields) => {
        err ? reject(err) : resolve(rs);
      })
    })
  },
  /**
   * 
   * @param {*} connection 连接sql后返回的实例
   * @param {string} table 表名
   * @param {string} data  形如(a,b),(c,d),(e,f)的插入值数组
   */
  inserts(connection, table, data) {
    return new Promise((resolve, reject) => {
      let sql = `insert into ${table} values ${data}`;
      connection.query(sql, (err, rs, fields) => {
        err ? reject(err) : resolve(rs);
      });
    });
  },
  update(connection, table, data, condName, condVal) {
    let sql = `update ${table} set ? where `;
    if (Array.isArray(condName) && Array.isArray(condVal)) {
      let conds = [];
      for (let i = 0; i < condName.length; i++) {
        conds.push(`${condName[i]} = '${condVal[i]}'`);
      }
      sql += conds.join(' and ');
    } else {
      sql += `${condName} = '${condVal}'`;
    }
    return new Promise((resolve, reject) => {
      connection.query(sql, data, (err, rs, fields) => {
        err && reject(err);

        let affectedRows = rs.affectedRows;
        if (affectedRows > 0) {
          resolve(rs.affectedRows);
        } else {
          let msg;
          switch (table) {
            case 'users':
              msg = '用户'; break;
            case 'projects':
              msg = '项目'; break;
            case 'plans':
              msg = '计划'; break;
            case 'events':
              msg = '事件'; break;
            default:
              msg = '项';
          }
          reject(new ResponseError(`更新失败, 该${msg}不存在`, 406));
        }
      })
    });
  },
  delete(connection, table, condName, condVal) {
    let sql = `delete from ${table} where `;
    if (Array.isArray(condName) && Array.isArray(condVal)) {
      let conds = [];
      for (let i = 0; i < condName.length; i++) {
        conds.push(`${condName[i]} = '${condVal[i]}'`);
      }
      sql += conds.join(' and ');
    } else {
      sql += `${condName} = '${condVal}'`;
    }
    return new Promise((resolve, reject) => {
      connection.query(sql, (err, rs, fields) => {
        err && reject(err);

        let affectedRows = rs.affectedRows;
        if (affectedRows > 0) {
          resolve(rs.affectedRows);
        } else {
          let msg;
          switch (table) {
            case 'users':
              msg = '用户'; break;
            case 'projects':
              msg = '项目'; break;
            case 'plans':
              msg = '计划'; break;
            case 'events':
              msg = '事件'; break;
            default:
              msg = '项';
          }
          reject(new ResponseError(`删除失败, 该${msg}不存在`, 406));
        }
      });
    })
  },
  view(connection, viewName) {
    return new Promise((resolve, reject) => {
      connection.query(`select * from ${viewName}`, (err, rs, fileds) => {
        err ? reject(err) : resolve(rs);
      })
    })
  },
  sql(connection, sql) {
    return new Promise((resolve, reject) => {
      sql &&
        connection.query(sql, (err, rs, fields) => {
          err ? reject(err) : resolve(rs);
        });
    });
  }

}