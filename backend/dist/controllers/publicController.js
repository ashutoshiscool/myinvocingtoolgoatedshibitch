"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicInvoice = getPublicInvoice;
exports.downloadPublicPDF = downloadPublicPDF;
exports.createOrder = createOrder;
exports.captureOrder = captureOrder;
const db_1 = require("../models/db");
const pdfService_1 = require("../services/pdfService");
const paypalService_1 = require("../services/paypalService");
async function getPublicInvoice(req, res) {
    const { secure_hash } = req.params;
    try {
        const db = await (0, db_1.getDb)();
        // Fetch invoice details
        const invoice = await db.get(`
      SELECT i.*, c.company_name as customer_name, c.contact_name as customer_contact, 
             c.email as customer_email, c.phone as customer_phone, c.address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.secure_hash = ?
    `, secure_hash);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }
        // Fetch line items
        const items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', invoice.id);
        // Fetch company settings (excluding admin password hashes/SMTP secrets)
        const company = await db.get(`
      SELECT company_name, address, phone, registration_code, director_name, logo_url, default_currency 
      FROM company_settings LIMIT 1
    `);
        // Fetch transactions
        const transactions = await db.all('SELECT * FROM transactions WHERE invoice_id = ? ORDER BY id DESC', invoice.id);
        res.json({
            invoice,
            items,
            company,
            transactions,
            paypalClientId: process.env.PAYPAL_CLIENT_ID || 'test'
        });
    }
    catch (error) {
        console.error('Error fetching public invoice: ', error);
        res.status(500).json({ error: 'Failed to retrieve invoice.' });
    }
}
async function downloadPublicPDF(req, res) {
    const { secure_hash } = req.params;
    try {
        const db = await (0, db_1.getDb)();
        const invoice = await db.get('SELECT * FROM invoices WHERE secure_hash = ?', secure_hash);
        if (!invoice) {
            return res.status(404).send('Invoice not found.');
        }
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', invoice.customer_id);
        const company = await db.get('SELECT * FROM company_settings LIMIT 1');
        const items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', invoice.id);
        const pdfBuffer = await (0, pdfService_1.generateInvoicePDF)(invoice, customer, company, items);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoice_number}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error downloading public PDF: ', error);
        res.status(500).send('Failed to generate PDF.');
    }
}
async function createOrder(req, res) {
    const { secure_hash } = req.params;
    try {
        const db = await (0, db_1.getDb)();
        const invoice = await db.get('SELECT * FROM invoices WHERE secure_hash = ?', secure_hash);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }
        if (invoice.status === 'paid') {
            return res.status(400).json({ error: 'Invoice has already been paid.' });
        }
        // Check if PayPal config is present
        const hasPaypalKeys = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
        if (!hasPaypalKeys) {
            // Return a simulated order ID to let them test payment without setup
            console.warn('PayPal client credentials not found in .env. Creating a mock order for testing.');
            return res.json({ id: `MOCK_ORDER_${Date.now()}`, isMock: true });
        }
        const order = await (0, paypalService_1.createPaypalOrder)(invoice.grand_total, invoice.currency, invoice.invoice_number);
        res.json({ id: order.id });
    }
    catch (error) {
        console.error('PayPal Order Creation error: ', error);
        res.status(500).json({ error: error.message || 'Failed to create PayPal order.' });
    }
}
async function captureOrder(req, res) {
    const { secure_hash } = req.params;
    const { orderId, isMock } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Missing PayPal order ID.' });
    }
    try {
        const db = await (0, db_1.getDb)();
        const invoice = await db.get('SELECT * FROM invoices WHERE secure_hash = ?', secure_hash);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }
        if (invoice.status === 'paid') {
            return res.status(400).json({ error: 'Invoice is already paid.' });
        }
        let captureData = {};
        if (isMock || orderId.startsWith('MOCK_ORDER_')) {
            // Mock PayPal Capture for simple sandbox verification
            captureData = {
                id: `MOCK_CAPTURE_${Date.now()}`,
                status: 'COMPLETED',
                purchase_units: [{
                        payments: {
                            captures: [{
                                    id: `MOCK_CAPTURE_ID_${Date.now()}`,
                                    amount: { value: invoice.grand_total, currency_code: invoice.currency }
                                }]
                        }
                    }],
                payer: { email_address: 'mock_payer@example.com' }
            };
        }
        else {
            captureData = await (0, paypalService_1.capturePaypalOrder)(orderId);
        }
        if (captureData.status === 'COMPLETED') {
            const captureId = captureData.purchase_units[0]?.payments?.captures[0]?.id || `MOCK_${Date.now()}`;
            const payerEmail = captureData.payer?.email_address || 'unknown@paypal.com';
            await db.run('BEGIN TRANSACTION');
            // Update invoice status to paid
            await db.run("UPDATE invoices SET status = 'paid' WHERE id = ?", invoice.id);
            // Record transaction
            await db.run(`
        INSERT INTO transactions (invoice_id, paypal_order_id, paypal_capture_id, amount, currency, status, payer_email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                invoice.id,
                orderId,
                captureId,
                invoice.grand_total,
                invoice.currency,
                'COMPLETED',
                payerEmail
            ]);
            await db.run('COMMIT');
            res.json({ success: true, message: 'Payment captured and invoice updated to paid.' });
        }
        else {
            res.status(400).json({ error: 'Payment was not completed successfully by PayPal.' });
        }
    }
    catch (error) {
        try {
            const db = await (0, db_1.getDb)();
            await db.run('ROLLBACK');
        }
        catch (_) { }
        console.error('PayPal Order Capture error: ', error);
        res.status(500).json({ error: error.message || 'Failed to capture PayPal order.' });
    }
}
