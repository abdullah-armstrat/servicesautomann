// controllers/companyController.js
const path  = require('path');
const multer = require('multer');
const companyModel = require('../models/companyModel');

// where to store uploaded logos
const uploadDir = path.join(__dirname,'..','public','uploads','company');
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, uploadDir),
  filename:    (req,file,cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'logo_' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

async function getCompany(req, res) {
  const company = await companyModel.get();
  res.render('company_form', { company });
}

async function postCompany(req, res) {
  const { name, tin, address, phone } = req.body;
  const logo = req.file ? req.file.filename : null;

  const existing = await companyModel.get();
  if (existing) {
    await companyModel.update(existing.id, { name, tin, address, phone, logo });
  } else {
    await companyModel.create({ name, tin, address, phone, logo });
  }
  res.redirect('/company');
}

module.exports = { getCompany, postCompany, upload };
