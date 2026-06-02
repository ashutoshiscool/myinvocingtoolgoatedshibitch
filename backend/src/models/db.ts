import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: Database | null = null;

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Open database connection
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Initialize Schema
  await initializeSchema(dbInstance);

  return dbInstance;
}

async function initializeSchema(db: Database) {
  // Company Settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_username TEXT NOT NULL,
      admin_password_hash TEXT NOT NULL,
      company_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      registration_code TEXT,
      director_name TEXT,
      logo_url TEXT,
      default_currency TEXT DEFAULT 'USD',
      default_tax_rate REAL DEFAULT 0.0,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_user TEXT,
      smtp_pass TEXT,
      smtp_from TEXT,
      smtp_encryption TEXT DEFAULT 'none',
      smtp_from_name TEXT DEFAULT 'Pterodactyl Panel',
      paypal_mode TEXT DEFAULT 'simulation',
      paypal_client_id TEXT,
      paypal_client_secret TEXT
    )
  `);

  // Migrate existing databases to support new SMTP configurations if they don't exist
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN smtp_encryption TEXT DEFAULT 'none'`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN smtp_from_name TEXT DEFAULT 'Pterodactyl Panel'`);
  } catch (err) {}

  // Migrate existing databases to support PayPal configurations if they don't exist
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN paypal_mode TEXT DEFAULT 'simulation'`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN paypal_client_id TEXT`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN paypal_client_secret TEXT`);
  } catch (err) {}

  // Migrate existing databases to support site branding
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN site_title TEXT`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE company_settings ADD COLUMN favicon_url TEXT`);
  } catch (err) {}

  // Customers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT NOT NULL,
      registration_code TEXT,
      director_name TEXT,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing databases to support new customer fields
  try {
    await db.exec(`ALTER TABLE customers ADD COLUMN registration_code TEXT`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE customers ADD COLUMN director_name TEXT`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE customers ADD COLUMN logo_url TEXT`);
  } catch (err) {}

  // Invoices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      grand_total REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      secure_hash TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )
  `);

  // Invoice Items table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // Transactions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      paypal_order_id TEXT NOT NULL,
      paypal_capture_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      payer_email TEXT,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // Check if settings table is empty, and seed the default admin
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM company_settings');
  if (settingsCount.count === 0) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPass, salt);

    await db.run(`
      INSERT INTO company_settings (
        admin_username,
        admin_password_hash,
        company_name,
        address,
        phone,
        default_currency,
        default_tax_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      adminUser,
      passwordHash,
      'My Company Name Ltd',
      '123 Business Rd, Office 4B, City, Country',
      '+1234567890',
      'USD',
      10.0 // Default 10% tax rate
    ]);

    console.log(`Default admin credentials seeded. Username: ${adminUser}, Password: ${adminPass}`);
  }
}
