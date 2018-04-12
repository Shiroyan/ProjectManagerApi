let router = require('express').Router();
let multer = require('multer');
let path = require('path');
let fs = require('fs');
let createProject = require('./create');
let updateProject = require('./update');
let deleteProject = require('./delete');
let getProjectsAbstract = require('./abstract');
let getProjectsDetail = require('./detail');
let downloadContract = require('./download');
let getStages = require('./stages');
let exchangeLeader = require('./leader');

let { isPM, isOnDuty } = require('../vertify');

const UPLOAD_PATH = '/contracts';

fs.existsSync(UPLOAD_PATH) || fs.mkdirSync(UPLOAD_PATH);


let storage = multer.diskStorage({
  destination(req, file, cb) {
    let path = `${UPLOAD_PATH}/${req.body.name}`;
    fs.existsSync(path) || fs.mkdirSync(path);
    cb(null, path);
  },
  filename(req, file, cb) {
    let { originalname } = file;
    let ext = originalname.match(/\..+/g)[0];
    let filename = `1${ext}`;
    cb(null, filename);
  }
});

let upload = multer({
  storage,
  fileFilter(req, file, cb) {
    let filename = file.originalname;
    let size = file.size;
    if (file.size > 2 * 1024 * 1024) {// 20M 
      cb(new ResponseError('文件过大, 已超过20M', 406));
    }
    cb(null, true);
  }
});

router.post('/', [isPM, upload.single('contract'), createProject]);
router.put('/:projectId/leader', [isPM, isOnDuty, exchangeLeader]);
router.put('/:projectId', [isPM, isOnDuty, upload.single('contract'), updateProject]);
router.get('/options', getStages);
router.delete('/:projectId', [isPM, isOnDuty, deleteProject]);
router.get('/', getProjectsAbstract);
router.get('/:projectId', getProjectsDetail);
router.get('/contracts/:projectId', downloadContract);

module.exports = router;
