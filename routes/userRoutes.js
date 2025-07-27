// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  accountPage,
  uploadMiddleware,
  uploadAvatar
} = require('../controllers/userController');

router.get('/account', accountPage);
router.post('/account', uploadMiddleware, uploadAvatar);

module.exports = router;
