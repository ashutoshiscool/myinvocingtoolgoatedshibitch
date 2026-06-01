import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './models/db';
import { authenticateJWT } from './middleware/auth';
import * as authController from './controllers/authController';
import * as settingsController from './controllers/settingsController';
import * as customerController from './controllers/customerController';
import * as invoiceController from './controllers/invoiceController';
import * as dashboardController from './controllers/dashboardController';
import * as publicController from './controllers/publicController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // For development, allow all. Can restrict in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Public check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Authentication Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authenticateJWT, authController.getMe);

// Settings Routes
app.get('/api/settings', authenticateJWT, settingsController.getSettings);
app.put('/api/settings', authenticateJWT, settingsController.updateSettings);

// Customer Routes
app.get('/api/customers', authenticateJWT, customerController.listCustomers);
app.post('/api/customers', authenticateJWT, customerController.createCustomer);
app.put('/api/customers/:id', authenticateJWT, customerController.updateCustomer);
app.delete('/api/customers/:id', authenticateJWT, customerController.deleteCustomer);

// Invoice Routes
app.get('/api/invoices', authenticateJWT, invoiceController.listInvoices);
app.get('/api/invoices/:id', authenticateJWT, invoiceController.getInvoice);
app.post('/api/invoices', authenticateJWT, invoiceController.createInvoice);
app.put('/api/invoices/:id', authenticateJWT, invoiceController.updateInvoice);
app.delete('/api/invoices/:id', authenticateJWT, invoiceController.deleteInvoice);
app.post('/api/invoices/:id/duplicate', authenticateJWT, invoiceController.duplicateInvoice);
app.post('/api/invoices/:id/send-email', authenticateJWT, invoiceController.sendInvoiceEmail);
app.post('/api/invoices/:id/mark-paid', authenticateJWT, invoiceController.markPaid);

// Dashboard Routes
app.get('/api/dashboard/stats', authenticateJWT, dashboardController.getStats);

// Public Customer-Facing Invoice Pages (No Auth Required)
app.get('/api/public/invoices/:secure_hash', publicController.getPublicInvoice);
app.get('/api/public/invoices/:secure_hash/pdf', publicController.downloadPublicPDF);
app.post('/api/public/invoices/:secure_hash/paypal-order', publicController.createOrder);
app.post('/api/public/invoices/:secure_hash/paypal-capture', publicController.captureOrder);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'An unhandled server error occurred.' });
});

// Start DB and Express Server
async function startServer() {
  try {
    console.log('Initializing SQLite Database...');
    await getDb();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`Lumor Pay Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
