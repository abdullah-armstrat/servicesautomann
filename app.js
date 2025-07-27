// app.js

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./utils/db');

const authController  = require('./controllers/authController');
const invoiceRoutes   = require('./routes/invoiceRoutes');
const userRoutes      = require('./routes/userRoutes');
const companyRoutes   = require('./routes/companyRoutes');
const companyModel    = require('./models/companyModel');

const app = express();

// ——— Session Setup —————————————————————————————————————————
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// ——— View Engine —————————————————————————————————————————
app.set('view engine', 'ejs');

// ——— Body Parsers ————————————————————————————————————————
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ——— Static Files ————————————————————————————————————————
app.use(express.static(path.join(__dirname, 'public')));

// ——— Inject username into all views ——————————————————————————
app.use((req, res, next) => {
  res.locals.username = req.session.user?.username;
  next();
});

// ——— Load company record into all views ————————————————————————
app.use(async (req, res, next) => {
  try {
    res.locals.company = await companyModel.get();
  } catch (err) {
    console.error('Error loading company:', err);
  }
  next();
});

// ——— Auth Routes ————————————————————————————————————————
app.get('/login',  authController.loginPage);
app.post('/login', authController.login);
app.get('/logout', authController.logout);

// ——— Dashboard / Home with metrics & revenueData ——————————————
app.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    // Total customers
    const custResult = await db.query('SELECT COUNT(*) AS count FROM customers');
    const totalCustomers = parseInt(custResult.rows[0].count, 10);

    // Total invoices
    const invResult = await db.query('SELECT COUNT(*) AS count FROM invoices');
    const totalInvoices = parseInt(invResult.rows[0].count, 10);

    // Total revenue
    const revSumResult = await db.query('SELECT COALESCE(SUM(total), 0) AS sum FROM invoices');
    const totalRevenue = parseFloat(revSumResult.rows[0].sum);

    // Average invoice value
    const avgInvoice = totalInvoices > 0
      ? parseFloat((totalRevenue / totalInvoices).toFixed(2))
      : 0;

    // Revenue by date
    const revDataResult = await db.query(`
      SELECT
        invoice_date::text AS date,
        COALESCE(SUM(total), 0) AS revenue
      FROM invoices
      GROUP BY invoice_date
      ORDER BY invoice_date
    `);
    const revenueData = revDataResult.rows.map(r => ({
      date: r.date,
      revenue: parseFloat(r.revenue)
    }));

    const metrics = { totalCustomers, totalInvoices, totalRevenue, avgInvoice };

    res.render('dashboard', { metrics, revenueData });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.render('dashboard', {
      metrics: {
        totalCustomers: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        avgInvoice: 0
      },
      revenueData: []
    });
  }
});

// ——— Feature Routes —————————————————————————————————————
app.use(invoiceRoutes);
app.use(userRoutes);
app.use(companyRoutes);

// ——— 404 Handler —————————————————————————————————————————
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// ——— Start Server ————————————————————————————————————————
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});