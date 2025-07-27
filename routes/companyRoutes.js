// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const { getCompany, postCompany, upload } = require('../controllers/companyController');

router.get('/company', getCompany);
router.post('/company', upload.single('logo'), postCompany);

module.exports = router;
