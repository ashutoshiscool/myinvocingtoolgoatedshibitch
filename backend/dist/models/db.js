"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let dbInstance = null;
const dbPath = process.env.DATABASE_PATH || path_1.default.join(__dirname, '../../database.sqlite');
async function getDb() {
    if (dbInstance) {
        return dbInstance;
    }
    // Open database connection
    dbInstance = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
    });
    // Enable foreign keys
    await dbInstance.run('PRAGMA foreign_keys = ON');
    // Initialize Schema
    await initializeSchema(dbInstance);
    return dbInstance;
}
async function initializeSchema(db) {
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
      smtp_from TEXT
    )
  `);
    // Customers table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(adminPass, salt);
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
