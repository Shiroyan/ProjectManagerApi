var morgan = require('morgan');
var rfs = require('rotating-file-stream');
var path = require('path');
var fs = require('fs');
var FileStreamRotator = require('file-stream-rotator')

var logDirectory = path.join(process.cwd(), 'log');


// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)

var accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'access-%DATE%.log'),
  frequency: 'daily',
  verbose: false
})

var errorLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'error-%DATE%.log'),
  frequency: 'daily',
  verbose: false
});


// logger format
morgan.token('uid', (req, res) => { return req.id; });
morgan.token('myDate', (req, res) => { return Date(); });
morgan.token('request', (req, res) => { return JSON.stringify(req.body); })

var logFormat = ':remote-addr - :uid  [:myDate] ":method :url HTTP/:http-version"  :status - :response-time ms :request';

var logger = {
  access() {
    return morgan(logFormat, {
      stream: accessLogStream,
    });
  },
  dev() {
    return morgan('dev');
  },
  error() {
    return morgan(logFormat, {
      stream: errorLogStream,
      skip(req, res) {
        return res.statusCode < 400;
      }
    })
  }
}
module.exports = logger;