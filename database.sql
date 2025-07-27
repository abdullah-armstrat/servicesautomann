-- database.sql

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(20),
    email        VARCHAR(100),
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_year INT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id           SERIAL PRIMARY KEY,
    customer_id  INT REFERENCES customers(id) ON DELETE CASCADE,
    invoice_date DATE DEFAULT CURRENT_DATE,
    subtotal     NUMERIC(10,2) DEFAULT 0.00,
    gst          NUMERIC(10,2) DEFAULT 0.00,    -- GST 5%
    qst          NUMERIC(10,2) DEFAULT 0.00,    -- QST 9.975%
    total        NUMERIC(10,2) DEFAULT 0.00
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id          SERIAL PRIMARY KEY,
    invoice_id  INT REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity    INT DEFAULT 1,
    unit_price  NUMERIC(10,2) DEFAULT 0.00,
    line_total  NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    tin         VARCHAR(50),
    address     TEXT,
    phone       VARCHAR(50),
    logo        VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add company_id FK to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS company_id INT
    REFERENCES companies(id)
    ON DELETE SET NULL
    DEFAULT NULL;