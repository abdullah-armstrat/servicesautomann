// controllers/invoiceDownloadController.js

const db      = require('../utils/db');
const ejs     = require('ejs');
const path    = require('path');
const pdf     = require('html-pdf');

async function downloadInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    // Fetch invoice
    const invoiceData = await db.query(
      `SELECT * FROM invoices WHERE id = $1`, [invoiceId]
    );
    const invoice = invoiceData.rows[0];
    if (!invoice) return res.status(404).send('Invoice not found');

    // Fetch customer
    const customerData = await db.query(
      `SELECT * FROM customers WHERE id = $1`, [invoice.customer_id]
    );
    const customer = customerData.rows[0];

    // Fetch company (so template can render header/logo)
    const companyData = await db.query(
      `SELECT * FROM companies ORDER BY id LIMIT 1`
    );
    const company = companyData.rows[0] || null;

    // Fetch items
    const itemsData = await db.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoiceId]
    );
    const items = itemsData.rows.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      quantity:  parseInt(item.quantity, 10)
    }));

    // Render HTML
    const html = await ejs.renderFile(
      path.join(__dirname, '../views/invoice_template.ejs'),
      {
        invoice: {
          id:        invoice.id,
          date:      invoice.invoice_date.toISOString().split('T')[0],
          subtotal:  parseFloat(invoice.subtotal),
          gst:       parseFloat(invoice.gst),
          qst:       parseFloat(invoice.qst),
          total:     parseFloat(invoice.total),
        },
        customer,
        items,
        company    // ← pass company into template
      }
    );

    // Stream PDF
    pdf.create(html).toStream((err, stream) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).send('Error generating PDF');
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=invoice_${invoice.id}.pdf`
      );
      stream.pipe(res);
    });

  } catch (err) {
    console.error('Invoice download error:', err);
    res.status(500).send('Server error');
  }
}

module.exports = { downloadInvoice };