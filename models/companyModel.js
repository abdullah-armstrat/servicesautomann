// models/companyModel.js
const db = require('../utils/db');

async function get() {
  const { rows } = await db.query('SELECT * FROM companies LIMIT 1');
  return rows[0];
}

async function create(data) {
  const { name, tin, address, phone, logo } = data;
  const { rows } = await db.query(
    `INSERT INTO companies (name, tin, address, phone, logo)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, tin, address, phone, logo]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ['name','tin','address','phone','logo']) {
    if (data[key] !== undefined && data[key] !== null) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }
  if (!fields.length) return get();
  values.push(id);
  const { rows } = await db.query(
    `UPDATE companies SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

module.exports = { get, create, update };
