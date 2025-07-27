// controllers/authController.js
require('dotenv').config();

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function loginPage(req, res) {
  res.render('login', { error: null });
}

function login(req, res) {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = { username };
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid username or password' });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = { loginPage, login, logout };