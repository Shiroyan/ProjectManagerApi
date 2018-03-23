var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var chalk = require('chalk');
var cors = require('cors');


var logger = require('./utils/logger');
global.ResponseError = require('./utils/res-error');

//  router
var index = require('./routes/index');
var { hasToken } = require('./routes/vertify');

//  users 接口
var users = require('./routes/users/index');

//  projects 接口
var projects = require('./routes/projects/index');

//  plans 接口
var plans = require('./routes/plans/index');

//  events 接口
var events = require('./routes/events/index');

//  schedules 接口
var schedules = require('./routes/schedules/index');

//  statistics  接口
var statistics = require('./routes/statistics/index');

//  util
require('./utils/date');
require('./utils/str2Array');
require('./utils/array');


var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger.dev());
app.use(logger.access());
app.use(logger.error());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
  res.header('Access-Control-Max-Age', '3600');
  res.header('Access-Control-Allow-Credentials', true);
  if (req.method.toLowerCase() === 'options') {
    res.send(200).end();
  } else {
    next();
  }
});
// app.use(cors());
app.use('/', index);
app.use('/', hasToken);
app.use('/users', users);
app.use('/projects', projects);
app.use('/plans', plans);
app.use('/events', events);
app.use('/schedules', schedules);
app.use('/statistics', statistics);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error(chalk.white(`${req.method} ${req.path}   `) + chalk.red(err));

  // render the error page
  switch (err.status) {
    case 401:
      res.clearCookie('token');
    case 403:
    case 406:
      res.status(err.status).json({
        error: err.message
      });
      break;
    case 404:
      res.status(err.status).json({
        error: '接口不存在，路径出错'
      });
    default:
      res.status(500).json({
        error: '未知错误',
        stack: error.stack
      });
  }
});


module.exports = app;
