// controllers/userController.js
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'public/uploads');

// Multer storage: filename = <username>.<ext>
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.session.user.username}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

function accountPage(req, res) {
  res.render('account');
}

function uploadMiddleware(req, res, next) {
  upload.single('avatar')(req, res, function(err) {
    if (err) console.error('Avatar upload error:', err);
    next();
  });
}

function uploadAvatar(req, res) {
  // Redirect back to account page (file saved to disk)
  res.redirect('/account');
}

module.exports = { accountPage, uploadMiddleware, uploadAvatar };
