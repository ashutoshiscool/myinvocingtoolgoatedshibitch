"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./models/db");
const auth_1 = require("./middleware/auth");
const authController = __importStar(require("./controllers/authController"));
const settingsController = __importStar(require("./controllers/settingsController"));
const customerController = __importStar(require("./controllers/customerController"));
const invoiceController = __importStar(require("./controllers/invoiceController"));
const dashboardController = __importStar(require("./controllers/dashboardController"));
const publicController = __importStar(require("./controllers/publicController"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // For development, allow all. Can restrict in production.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Public check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// Authentication Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', auth_1.authenticateJWT, authController.getMe);
// Settings Routes
app.get('/api/settings', auth_1.authenticateJWT, settingsController.getSettings);
app.put('/api/settings', auth_1.authenticateJWT, settingsController.updateSettings);
// Customer Routes
app.get('/api/customers', auth_1.authenticateJWT, customerController.listCustomers);
app.post('/api/customers', auth_1.authenticateJWT, customerController.createCustomer);
app.put('/api/customers/:id', auth_1.authenticateJWT, customerController.updateCustomer);
app.delete('/api/customers/:id', auth_1.authenticateJWT, customerController.deleteCustomer);
// Invoice Routes
app.get('/api/invoices', auth_1.authenticateJWT, invoiceController.listInvoices);
app.get('/api/invoices/:id', auth_1.authenticateJWT, invoiceController.getInvoice);
app.post('/api/invoices', auth_1.authenticateJWT, invoiceController.createInvoice);
app.put('/api/invoices/:id', auth_1.authenticateJWT, invoiceController.updateInvoice);
app.delete('/api/invoices/:id', auth_1.authenticateJWT, invoiceController.deleteInvoice);
app.post('/api/invoices/:id/duplicate', auth_1.authenticateJWT, invoiceController.duplicateInvoice);
app.post('/api/invoices/:id/send-email', auth_1.authenticateJWT, invoiceController.sendInvoiceEmail);
app.post('/api/invoices/:id/mark-paid', auth_1.authenticateJWT, invoiceController.markPaid);
// Dashboard Routes
app.get('/api/dashboard/stats', auth_1.authenticateJWT, dashboardController.getStats);
// Public Customer-Facing Invoice Pages (No Auth Required)
app.get('/api/public/invoices/:secure_hash', publicController.getPublicInvoice);
app.get('/api/public/invoices/:secure_hash/pdf', publicController.downloadPublicPDF);
app.post('/api/public/invoices/:secure_hash/paypal-order', publicController.createOrder);
app.post('/api/public/invoices/:secure_hash/paypal-capture', publicController.captureOrder);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'An unhandled server error occurred.' });
});
// Start DB and Express Server
async function startServer() {
    try {
        console.log('Initializing SQLite Database...');
        await (0, db_1.getDb)();
        console.log('Database initialized successfully.');
        app.listen(PORT, () => {
            console.log(`Lumor Pay Backend listening on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
