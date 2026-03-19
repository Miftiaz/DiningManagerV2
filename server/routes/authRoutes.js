const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  registerManager,
  loginManager,
  getDashboard,
  startDiningMonth
} = require('../controllers/authController');

router.post('/register', registerManager);
router.post('/login', loginManager);
router.get('/dashboard', authMiddleware, getDashboard);
router.post('/dining-month/start', authMiddleware, startDiningMonth);

module.exports = router;
