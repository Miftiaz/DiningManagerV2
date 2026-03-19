const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getFeastTokenList,
  getFeastTokenDetails,
  createFeastToken,
  updateFeastTokenPayment
} = require('../controllers/feastTokenController');

router.get('/list', authMiddleware, getFeastTokenList);
router.get('/:tokenId', authMiddleware, getFeastTokenDetails);
router.post('/create', authMiddleware, createFeastToken);
router.post('/:tokenId/payment', authMiddleware, updateFeastTokenPayment);

module.exports = router;
