// routes/invoiceRoutes.js
const express = require('express');
const router  = express.Router();

const invoiceCtrl      = require('../controllers/invoiceController');
const invoiceListCtrl  = require('../controllers/invoiceListController');

/* ---------- list (pagination) ---------- */
router.get('/invoices', invoiceListCtrl.listInvoices);

/* ---------- create via HTML form ---------- */
router.get('/create-invoice', invoiceCtrl.createInvoicePage);
router.post('/create-invoice', invoiceCtrl.createInvoiceFormHandler);

/* ---------- API (optional) ---------- */
router.post('/api/create-invoice', invoiceCtrl.createInvoice);

/* ---------- NEW  download & edit ---------- */
router.get('/invoice/:id/pdf',  invoiceCtrl.downloadInvoicePDF);   // Download
router.get('/invoice/:id/edit', invoiceCtrl.editInvoicePage);      // Edit page
router.post('/invoice/:id/edit', invoiceCtrl.updateInvoiceForm);   // Save edits

module.exports = router;
