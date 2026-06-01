"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
const db_1 = require("../models/db");
async function listCustomers(req, res) {
    try {
        const db = await (0, db_1.getDb)();
        const customers = await db.all('SELECT * FROM customers ORDER BY company_name ASC');
        res.json(customers);
    }
    catch (error) {
        console.error('Error fetching customers: ', error);
        res.status(500).json({ error: 'Failed to retrieve customers.' });
    }
}
async function createCustomer(req, res) {
    const { company_name, contact_name, email, phone, address } = req.body;
    if (!company_name || !contact_name || !email || !address) {
        return res.status(400).json({ error: 'Company name, contact name, email, and address are required.' });
    }
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.run(`
      INSERT INTO customers (company_name, contact_name, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, [company_name, contact_name, email, phone || null, address]);
        const newCustomer = await db.get('SELECT * FROM customers WHERE id = ?', result.lastID);
        res.status(201).json(newCustomer);
    }
    catch (error) {
        console.error('Error creating customer: ', error);
        res.status(500).json({ error: 'Failed to create customer.' });
    }
}
async function updateCustomer(req, res) {
    const { id } = req.params;
    const { company_name, contact_name, email, phone, address } = req.body;
    if (!company_name || !contact_name || !email || !address) {
        return res.status(400).json({ error: 'Company name, contact name, email, and address are required.' });
    }
    try {
        const db = await (0, db_1.getDb)();
        const customerExists = await db.get('SELECT id FROM customers WHERE id = ?', id);
        if (!customerExists) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        await db.run(`
      UPDATE customers
      SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [company_name, contact_name, email, phone || null, address, id]);
        const updatedCustomer = await db.get('SELECT * FROM customers WHERE id = ?', id);
        res.json(updatedCustomer);
    }
    catch (error) {
        console.error('Error updating customer: ', error);
        res.status(500).json({ error: 'Failed to update customer.' });
    }
}
async function deleteCustomer(req, res) {
    const { id } = req.params;
    try {
        const db = await (0, db_1.getDb)();
        // Check if the customer has any invoices
        const activeInvoices = await db.get('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?', id);
        if (activeInvoices.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete customer because they have existing invoices. Delete the invoices first.'
            });
        }
        const result = await db.run('DELETE FROM customers WHERE id = ?', id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        res.json({ message: 'Customer deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting customer: ', error);
        res.status(500).json({ error: 'Failed to delete customer.' });
    }
}
