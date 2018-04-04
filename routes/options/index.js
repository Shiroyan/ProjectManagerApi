let router = require('express').Router();
let { isAdmin } = require('../vertify');

let add = require('./add');
let update = require('./update');
let _delete = require('./delete');

router.post('/:type', [isAdmin, add]);
router.put('/:type/:id', [isAdmin, update]);
router.delete('/:type/:id', [isAdmin, _delete]);

module.exports = router;