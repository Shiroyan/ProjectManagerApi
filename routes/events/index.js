let router = require('express').Router();
let { isPM, isOnDuty, isPlanExist, isEventExist } = require('../vertify');

let { getTags, addTag } = require('./tags');
let { createEvent } = require('./create');
let updateEvent = require('./update');
let getEvents = require('./get');
let finishEvent = require('./finish');
let { deleteEvent } = require('./delete');

router.get('/tags', getTags);
router.get('/', getEvents);
router.post('/', [isPM, isOnDuty, isPlanExist, createEvent]);
router.put('/:eventId', [isPM, isOnDuty, isPlanExist, isEventExist, updateEvent]);
router.delete('/:eventId', [isPM, isOnDuty, isPlanExist, isEventExist, deleteEvent]);
router.put('/:eventId/status', finishEvent);

module.exports = router;