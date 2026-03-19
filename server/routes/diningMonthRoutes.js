const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getDiningMonthCalendar,
  addBreak,
  removeBreak,
  addBreakDate,
  removeBreakDate,
  addBreakDates,
  removeBreakDates
} = require('../controllers/diningMonthController');

router.get('/calendar', authMiddleware, getDiningMonthCalendar);
router.post('/break/add-dates', authMiddleware, addBreakDates);
router.post('/break/remove-dates', authMiddleware, removeBreakDates);

module.exports = router;
