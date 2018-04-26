let router = require('express').Router();
let { isPM } = require('../vertify');


let { getProjects } = require('./projects');
let { addEvaluation } = require('./add');
let { getAllEvaluation } = require('./get');
let { updateEvaluation } = require('./update');
let { deleteEvaluation } = require('./delete');
let { getTable } = require('./table');

router.get('/projects', getProjects);
router.post('/', [isPM, addEvaluation]);
router.put('/', [isPM, updateEvaluation]);
router.delete('/', [isPM, deleteEvaluation]);
router.get('/table/:date', getTable);
router.get('/:year', getAllEvaluation);

module.exports = router;