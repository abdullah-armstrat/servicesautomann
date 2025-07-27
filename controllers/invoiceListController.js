// controllers/invoiceListController.js
const invoiceModel = require('../models/invoiceModel');
const PAGE_SIZE    = invoiceModel.PAGE_SIZE;

/* GET /invoices?page=n */
async function listInvoices(req, res) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);

  try {
    const { rows, total } = await invoiceModel.getInvoicesPaged(page);
    const pages = Math.ceil(total / PAGE_SIZE);
    res.render('invoice_list', { invoices: rows, page, pages });
  } catch (err) {
    console.error('Invoice list error:', err);
    res.status(500).send('Server error');
  }
}

module.exports = { listInvoices };