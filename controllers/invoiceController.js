// controllers/invoiceController.js
require('dotenv').config();

const PDFDocument  = require('pdfkit');
const invoiceModel = require('../models/invoiceModel');
const db           = require('../utils/db');

/* ─────────────────────────────────────────────── */
/* 1.  Render “Create Invoice” form               */
/* ─────────────────────────────────────────────── */
function createInvoicePage(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  res.render('invoice_form', {
    error: null,
    currentDate: today,
    edit: false,
    inv: null,
    items: []
  });
}

/* ─────────────────────────────────────────────── */
/* 2.  Handle HTML form submit  (create)          */
/* ─────────────────────────────────────────────── */
async function createInvoiceFormHandler(req, res) {
  try {
    /* customer fields */
    const customer = {
      name:  req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      vehicle_make:  req.body.vehicle_make,
      vehicle_model: req.body.vehicle_model,
      vehicle_year:  req.body.vehicle_year
    };

    /* arrays (thanks to [] names) */
    const desc = [].concat(req.body['description[]'] || req.body.description || []);
    const qty  = [].concat(req.body['quantity[]']    || req.body.quantity    || []);
    const unit = [].concat(req.body['unit_price[]']  || req.body.unit_price  || []);

    const items = desc.map((d, i) => ({
      description: d,
      quantity:    Number(qty[i]),
      unit_price:  Number(unit[i])
    })).filter(it => it.description && it.quantity > 0 && it.unit_price > 0);

    if (!items.length) {
      return res.render('invoice_form', {
        error: 'Add at least one valid item.',
        currentDate: req.body.invoice_date,
        edit: false,
        inv: null,
        items: []
      });
    }

    const newCust = await invoiceModel.addCustomer(customer);
    await invoiceModel.createInvoice(newCust.id, items, req.body.invoice_date);
    res.redirect('/invoices');
  } catch (err) {
    console.error('Create invoice error:', err);
    res.render('invoice_form', {
      error: 'Server error',
      currentDate: req.body.invoice_date,
      edit: false,
      inv: null,
      items: []
    });
  }
}

/* ─────────────────────────────────────────────── */
/* 3.  Optional JSON API (unchanged)              */
/* ─────────────────────────────────────────────── */
async function createInvoice(req, res) {
  try {
    const { customer, items, invoice_date = null } = req.body;
    if (!customer || !Array.isArray(items))
      return res.status(400).json({ error: 'Invalid payload' });

    const newCust = await invoiceModel.addCustomer(customer);
    const inv     = await invoiceModel.createInvoice(newCust.id, items, invoice_date);
    res.json({ message: 'Invoice created', invoice: inv });
  } catch (err) {
    console.error('API invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/* ───────────────────────────────────────────────────────────── */
/*  DOWNLOAD PDF  –  now injects live company + invoice fields  */
/* ───────────────────────────────────────────────────────────── */
async function downloadInvoicePDF(req, res) {
  const id = +req.params.id || 0;
  if (!id) return res.status(400).send('Bad id');

  /* fetch single company profile (assumes one row) */
  const { rows:[company] } = await db.query(`SELECT * FROM company LIMIT 1`);

  /* invoice + customer + items */
  const { rows:[inv] } = await db.query(
    `SELECT i.*, c.*
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1`, [id]);
  if (!inv) return res.status(404).send('Invoice not found');

  const { rows: items } = await db.query(
    `SELECT description, quantity, unit_price
       FROM invoice_items WHERE invoice_id = $1`, [id]);

  /* coercions */
  ['subtotal','gst','qst','total'].forEach(f => inv[f] = Number(inv[f]));
  const invDateStr = new Date(inv.invoice_date).toISOString().slice(0,10);

  /* PDFKit setup */
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  /* 1. Header ----------------------------------------------------- */
  if (company?.logo) {
    try { doc.image(`uploads/company/${company.logo}`, 50, 45, { width: 140 }); } catch {}
  }
  doc.fontSize(20).font('Helvetica-Bold')
     .text(company?.name || 'ServicesAutomann Inc.', 0, 50, { align:'right' })
     .fontSize(10).font('Helvetica')
     .text((company?.address || '1234 Main St\nAnyTown, QC H0H 0H0').replace(/\n/g,'\n'),
           { align:'right' })
     .text(`TIN: ${company?.tin || '—'}`, { align:'right' })
     .text(`Phone: ${company?.phone || '—'}`, { align:'right' });

  /* 2. Invoice + Bill‑To ----------------------------------------- */
  doc.moveDown(2);
  const label = (txt) => doc.font('Helvetica-Bold').text(txt).font('Helvetica');
  label(`Invoice #${id}`); doc.text(`Date: ${invDateStr}`);
  doc.moveDown();
  label('Bill To');
  doc.text(inv.name)
     .text(inv.email || '')
     .text(inv.phone || '')
     .text(`${inv.vehicle_year||''} ${inv.vehicle_make||''} ${inv.vehicle_model||''}`);

  /* 3. Items table (same polished layout) ------------------------ */
  doc.moveDown(1.5);
  const tableTop = doc.y, rowH = 20;
  const col = { d:50, q:330, p:400, t:480 };

  doc.rect(50, tableTop, 515, rowH).fill('#f0f0f5').stroke();
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10)
     .text('Description', col.d+4, tableTop+5)
     .text('Qty',         col.q+4, tableTop+5)
     .text('Unit $',      col.p+4, tableTop+5)
     .text('Line $',      col.t+4, tableTop+5);
  doc.font('Helvetica').fillColor('#000');

  let y = tableTop + rowH;
  items.forEach((it, i) => {
    if (i % 2 === 0) doc.rect(50, y, 515, rowH).fill('#fafafa').stroke();
    else doc.rect(50, y, 515, rowH).fill('#FFFFFF').stroke();

    const qty = Number(it.quantity), unit = Number(it.unit_price), line = qty*unit;
    doc.text(it.description, col.d+4, y+5, { width: col.q-col.d-8 })
       .text(qty, col.q+4, y+5, { width: col.p-col.q-8, align:'right' })
       .text(unit.toFixed(2), col.p+4, y+5, { width: col.t-col.p-8, align:'right' })
       .text(line.toFixed(2), col.t+4, y+5, { width: col.t-col.p-8, align:'right' });
    y += rowH;
  });

  /* 4. Totals box ------------------------------------------------- */
  y += 12;
  const boxW = 200, boxX = 50 + 515 - boxW;
  doc.rect(boxX, y, boxW, 90).stroke('#d0d0d0');

  const rows = [
    ['Subtotal', inv.subtotal],
    ['GST (5%)', inv.gst],
    ['QST (9.975%)', inv.qst],
    ['Total', inv.total, true]
  ];
  const labelOpts = { width: boxW*0.6, align:'right' };
  const valOpts   = { width: boxW*0.4, align:'right' };
  rows.forEach(([lbl, val, bold], idx) => {
    const lineY = y + 6 + idx*18;
    if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    doc.text(lbl, boxX+5, lineY, labelOpts)
       .text(val.toFixed(2), boxX + boxW*0.6, lineY, valOpts);
  });

  doc.end();
}


/* ────────────────────────────────────────────────────────────── */
/*  DOWNLOAD  –  PDF with company from `companies` table          */
/* ────────────────────────────────────────────────────────────── */
async function downloadInvoicePDF(req, res) {
  const id = +req.params.id || 0;
  if (!id) return res.status(400).send('Bad id');

  /* 1. Invoice, customer, items ---------------------------------- */
  const { rows:[inv] } = await db.query(
    `SELECT i.*, c.*, i.company_id
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1`, [id]);
  if (!inv) return res.status(404).send('Invoice not found');

  const { rows: items } = await db.query(
    `SELECT description, quantity, unit_price
       FROM invoice_items
      WHERE invoice_id = $1`, [id]);

  /* 2. Company (linked or first row) ----------------------------- */
  let company = {};
  try {
    if (inv.company_id) {
      const { rows:[cmp] } = await db.query(
        `SELECT * FROM companies WHERE id=$1`, [inv.company_id]);
      company = cmp || {};
    } else {
      const { rows:[cmp] } = await db.query(`SELECT * FROM companies LIMIT 1`);
      company = cmp || {};
    }
  } catch { /* table might not exist */ }

  /* 3. Cast numerics & date -------------------------------------- */
  ['subtotal','gst','qst','total'].forEach(f => inv[f] = Number(inv[f]));
  const invDate = new Date(inv.invoice_date).toISOString().slice(0,10);

  /* 4. PDFKit setup --------------------------------------------- */
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin:50, size:'A4' });
  res.setHeader('Content-Disposition',`attachment; filename=invoice-${id}.pdf`);
  res.setHeader('Content-Type','application/pdf');
  doc.pipe(res);

  /* Header */
  if (company.logo) {
    try { doc.image(`uploads/company/${company.logo}`, 50, 45, { width:140 }); } catch {}
  }
  doc.fontSize(20).font('Helvetica-Bold')
     .text(company.name || 'ServicesAutomann Inc.', 0, 50, { align:'right' })
     .fontSize(10).font('Helvetica')
     .text((company.address || '1234 Main St\nAnyTown, QC H0H 0H0')
            .replace(/\n/g,'\n'),
           { align:'right' })
     .text(`TIN: ${company.tin || '—'}`,   { align:'right' })
     .text(`Phone: ${company.phone || '—'}`, { align:'right' });

  /* Invoice & Bill‑To */
  doc.moveDown(2);
  const label = t => doc.font('Helvetica-Bold').text(t).font('Helvetica');
  label(`Invoice #${id}`); doc.text(`Date: ${invDate}`);
  doc.moveDown();
  label('Bill To');
  doc.text(inv.name)
     .text(inv.email || '')
     .text(inv.phone || '')
     .text(`${inv.vehicle_year||''} ${inv.vehicle_make||''} ${inv.vehicle_model||''}`);

  /* Items table (same layout as before) */
  doc.moveDown(1.5);
  const rowH = 20, top = doc.y, col={d:50,q:330,p:400,t:480};
  doc.rect(50, top, 515, rowH).fill('#f0f0f5').stroke();
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10)
     .text('Description', col.d+4, top+5)
     .text('Qty',         col.q+4, top+5)
     .text('Unit $',      col.p+4, top+5)
     .text('Line $',      col.t+4, top+5);
  doc.font('Helvetica');
  let y = top + rowH;
  items.forEach((it,i)=>{
    if(i%2===0) doc.rect(50,y,515,rowH).fill('#fafafa').stroke();
    else        doc.rect(50,y,515,rowH).fill('#FFFFFF').stroke();
    const qty=Number(it.quantity), unit=Number(it.unit_price), line=qty*unit;
    doc.text(it.description, col.d+4,y+5,{width:col.q-col.d-8})
       .text(qty,  col.q+4,y+5,{width:col.p-col.q-8,align:'right'})
       .text(unit.toFixed(2), col.p+4,y+5,{width:col.t-col.p-8,align:'right'})
       .text(line.toFixed(2), col.t+4,y+5,{width:col.t-col.p-8,align:'right'});
    y += rowH;
  });

  /* Totals box */
  y += 12;
  const boxW=200, boxX=565-boxW;
  doc.rect(boxX,y,boxW,90).stroke('#d0d0d0');
  const rows=[
    ['Subtotal',inv.subtotal],
    ['GST (5%)',inv.gst],
    ['QST (9.975%)',inv.qst],
    ['Total',inv.total,true]
  ];
  const labelOpt={width:boxW*0.6,align:'right'};
  const valOpt={width:boxW*0.4,align:'right'};
  rows.forEach(([lbl,val,bold],i)=>{
    doc.font(bold?'Helvetica-Bold':'Helvetica')
       .text(lbl, boxX+5, y+6+i*18, labelOpt)
       .text(val.toFixed(2), boxX+boxW*0.6, y+6+i*18, valOpt);
  });

  doc.end();
}

/* ─────────────────────────────────────────────── */
/* 5.  Edit page                                  */
/* ─────────────────────────────────────────────── */
async function editInvoicePage(req, res) {
  const id = +req.params.id || 0;
  const { rows:[inv] } = await db.query(
    `SELECT i.*, c.*
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
      WHERE i.id=$1`, [id]);
  if (!inv) return res.status(404).send('Not found');

  const { rows: items } = await db.query(
    `SELECT description, quantity, unit_price
       FROM invoice_items WHERE invoice_id=$1`, [id]);

  res.render('invoice_form', {
    error: null,
    currentDate: inv.invoice_date.toISOString().slice(0, 10),
    edit: true,
    inv,
    items
  });
}

/* ─────────────────────────────────────────────── */
/* 6.  Save edits (simple status toggle demo)     */
/* ─────────────────────────────────────────────── */
async function updateInvoiceForm(req, res) {
  const id = +req.params.id || 0;
  const status = req.body.status === 'Paid' ? 'Paid' : 'Unpaid';
  await db.query(`UPDATE invoices SET status=$1 WHERE id=$2`, [status, id]);
  res.redirect('/invoices');
}

/* ─────────────────────────────────────────────── */
/* 7.  Exports                                    */
/* ─────────────────────────────────────────────── */
module.exports = {
  createInvoicePage,
  createInvoiceFormHandler,
  createInvoice,
  downloadInvoicePDF,
  editInvoicePage,
  updateInvoiceForm
};
