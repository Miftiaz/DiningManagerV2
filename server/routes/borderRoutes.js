const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  searchStudent,
  getCalendarForAdjustment,
  adjustStudentDays,
  returnToken,
  payFeastDue,
  clearPaymentDue,
  payDailyFeastQuota,
  getAllStudents,
  getAllTransactions
} = require('../controllers/borderController');

router.get('/search', authMiddleware, searchStudent);
router.get('/all-students', authMiddleware, getAllStudents);
router.get('/calendar', authMiddleware, getCalendarForAdjustment);
router.get('/transactions', authMiddleware, getAllTransactions);
router.post('/adjust', authMiddleware, adjustStudentDays);
router.post('/return-token', authMiddleware, returnToken);
router.post('/pay-feast', authMiddleware, payFeastDue);
router.post('/clear-payment-due', authMiddleware, clearPaymentDue);
router.post('/pay-daily-feast-quota', authMiddleware, payDailyFeastQuota);

module.exports = router;
