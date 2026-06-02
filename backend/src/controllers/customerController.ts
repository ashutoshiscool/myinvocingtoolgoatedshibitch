import { Response } from 'express';
import { getDb } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth';

export async function listCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const db = await getDb();
    const customers = await db.all('SELECT * FROM customers ORDER BY company_name ASC');
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers: ', error);
    res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  const { company_name, contact_name, email, phone, address, registration_code, director_name, logo_url } = req.body;

  if (!company_name || !contact_name || !email || !address) {
    return res.status(400).json({ error: 'Company name, contact name, email, and address are required.' });
  }

  try {
    const db = await getDb();
    const result = await db.run(`
      INSERT INTO customers (company_name, contact_name, email, phone, address, registration_code, director_name, logo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [company_name, contact_name, email, phone || null, address, registration_code || null, director_name || null, logo_url || null]);

    const newCustomer = await db.get('SELECT * FROM customers WHERE id = ?', result.lastID);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer: ', error);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { company_name, contact_name, email, phone, address, registration_code, director_name, logo_url } = req.body;

  if (!company_name || !contact_name || !email || !address) {
    return res.status(400).json({ error: 'Company name, contact name, email, and address are required.' });
  }

  try {
    const db = await getDb();
    const customerExists = await db.get('SELECT id FROM customers WHERE id = ?', id);

    if (!customerExists) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    await db.run(`
      UPDATE customers
      SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, registration_code = ?, director_name = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [company_name, contact_name, email, phone || null, address, registration_code || null, director_name || null, logo_url || null, id]);

    const updatedCustomer = await db.get('SELECT * FROM customers WHERE id = ?', id);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer: ', error);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();
    
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
  } catch (error) {
    console.error('Error deleting customer: ', error);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
}
