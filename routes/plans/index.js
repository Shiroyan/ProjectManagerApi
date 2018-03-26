let router = require('express').Router();
let { isPM, isOnDuty, isPlanExist } = require('../vertify');

let createPlan = require('./create');
let updatePlan = require('./update');
let { deletePlan } = require('./delete');
let getAllPlan = require('./all');

router.post('/', [isPM, isOnDuty, createPlan]);
router.put('/:planId', [isPM, isOnDuty, isPlanExist, updatePlan]);
router.delete('/:planId', [isPM, isOnDuty, isPlanExist, deletePlan]);
router.get('/', getAllPlan);

module.exports = router;