// models/invoiceModel.js
const db = require('../utils/db');

const PAGE_SIZE = 10;

/* ───────── add‑invoice helpers (unchanged) ───────── */
function calcTotals(items) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const gst  = +(subtotal * 0.05).toFixed(2);
  const qst  = +(subtotal * 0.09975).toFixed(2);
  return { subtotal, gst, qst, total: +(subtotal + gst + qst).toFixed(2) };
}

async function addCustomer(c) { /* … existing code … */ }
async function createInvoice(customer_id, items, invoice_date = null) { /* … */ }

/* ───────── paginated list (date formatted) ───────── */
async function getInvoicesPaged(page = 1) {
  const offset = (page - 1) * PAGE_SIZE;

  const { rows } = await db.query(
    `SELECT i.id,
            TO_CHAR(i.invoice_date,'YYYY-MM-DD') AS inv_date,
            i.total,
            c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
      ORDER BY i.id DESC
      LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, offset]
  );

  const { rows: [{ count }] } = await db.query(`SELECT COUNT(*) FROM invoices`);
  return { rows, total: +count };
}

module.exports = {
  addCustomer,
  createInvoice,
  getInvoicesPaged,
  PAGE_SIZE               // exported so controller can reuse
};