import { Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateInvoicePDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';

// Helper to generate sequential invoice numbers
async function getNextInvoiceNumber(db: any): Promise<string> {
  const lastInvoice = await db.get('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
  if (!lastInvoice) {
    return 'INV-0001';
  }
  
  const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `INV-${nextNum.toString().padStart(4, '0')}`;
  }
  
  return `INV-${Date.now()}`;
}

export async function listInvoices(req: AuthenticatedRequest, res: Response) {
  const { customer, status, date, currency } = req.query;

  try {
    const db = await getDb();
    let query = `
      SELECT i.*, c.company_name as customer_name, c.contact_name as customer_contact
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customer) {
      query += ` AND (c.company_name LIKE ? OR c.contact_name LIKE ?) `;
      params.push(`%${customer}%`, `%${customer}%`);
    }
    if (status) {
      query += ` AND i.status = ? `;
      params.push(status);
    }
    if (date) {
      query += ` AND i.issue_date = ? `;
      params.push(date);
    }
    if (currency) {
      query += ` AND i.currency = ? `;
      params.push(currency);
    }

    query += ` ORDER BY i.id DESC `;

    const invoices = await db.all(query, params);
    res.json(invoices);
  } catch (error) {
    console.error('Error listing invoices: ', error);
    res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
}

export async function getInvoice(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const invoice = await db.get(`
      SELECT i.*, c.company_name as customer_name, c.contact_name as customer_contact, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', id);
    res.json({ ...invoice, items });
  } catch (error) {
    console.error('Error fetching invoice: ', error);
    res.status(500).json({ error: 'Failed to retrieve invoice details.' });
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  const {
    customer_id,
    issue_date,
    due_date,
    currency,
    tax_rate,
    notes,
    items
  } = req.body;

  if (!customer_id || !issue_date || !due_date || !currency || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required invoice details or items.' });
  }

  try {
    const db = await getDb();

    // Verify customer exists
    const customer = await db.get('SELECT id FROM customers WHERE id = ?', customer_id);
    if (!customer) {
      return res.status(400).json({ error: 'Selected customer does not exist.' });
    }

    // Auto-generate invoice number & secure hash
    const invoice_number = await getNextInvoiceNumber(db);
    const secure_hash = crypto.randomBytes(24).toString('hex');

    // Calculate sums
    let subtotal = 0;
    const itemsData = items.map((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unit_price = Number(item.unit_price) || 0;
      const total = quantity * unit_price;
      subtotal += total;
      return {
        description: item.description,
        quantity,
        unit_price,
        total
      };
    });

    const finalTaxRate = Number(tax_rate) || 0;
    const tax_amount = (subtotal * finalTaxRate) / 100;
    const grand_total = subtotal + tax_amount;

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    const result = await db.run(`
      INSERT INTO invoices (
        invoice_number, customer_id, issue_date, due_date, currency, 
        status, subtotal, tax_rate, tax_amount, grand_total, notes, secure_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_number,
      customer_id,
      issue_date,
      due_date,
      currency,
      'draft',
      subtotal,
      finalTaxRate,
      tax_amount,
      grand_total,
      notes || null,
      secure_hash
    ]);

    const invoiceId = result.lastID;

    // Insert line items
    for (const item of itemsData) {
      await db.run(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `, [invoiceId, item.description, item.quantity, item.unit_price, item.total]);
    }

    await db.run('COMMIT');

    const newInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', invoiceId);
    const newItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', invoiceId);

    res.status(201).json({ ...newInvoice, items: newItems });
  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    console.error('Error creating invoice: ', error);
    res.status(500).json({ error: 'Failed to create invoice.' });
  }
}

export async function updateInvoice(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const {
    customer_id,
    issue_date,
    due_date,
    currency,
    tax_rate,
    status,
    notes,
    items
  } = req.body;

  if (!customer_id || !issue_date || !due_date || !currency || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required invoice details or items.' });
  }

  try {
    const db = await getDb();
    
    // Verify invoice exists
    const invoice = await db.get('SELECT id FROM invoices WHERE id = ?', id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Verify customer exists
    const customer = await db.get('SELECT id FROM customers WHERE id = ?', customer_id);
    if (!customer) {
      return res.status(400).json({ error: 'Selected customer does not exist.' });
    }

    // Recalculate totals
    let subtotal = 0;
    const itemsData = items.map((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unit_price = Number(item.unit_price) || 0;
      const total = quantity * unit_price;
      subtotal += total;
      return {
        description: item.description,
        quantity,
        unit_price,
        total
      };
    });

    const finalTaxRate = Number(tax_rate) || 0;
    const tax_amount = (subtotal * finalTaxRate) / 100;
    const grand_total = subtotal + tax_amount;

    await db.run('BEGIN TRANSACTION');

    // Update invoice
    await db.run(`
      UPDATE invoices
      SET 
        customer_id = ?,
        issue_date = ?,
        due_date = ?,
        currency = ?,
        status = ?,
        subtotal = ?,
        tax_rate = ?,
        tax_amount = ?,
        grand_total = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      customer_id,
      issue_date,
      due_date,
      currency,
      status || 'draft',
      subtotal,
      finalTaxRate,
      tax_amount,
      grand_total,
      notes || null,
      id
    ]);

    // Clear old items and insert updated ones
    await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', id);
    for (const item of itemsData) {
      await db.run(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `, [id, item.description, item.quantity, item.unit_price, item.total]);
    }

    await db.run('COMMIT');

    const updatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
    const updatedItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', id);

    res.json({ ...updatedInvoice, items: updatedItems });
  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    console.error('Error updating invoice: ', error);
    res.status(500).json({ error: 'Failed to update invoice.' });
  }
}

export async function deleteInvoice(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM invoices WHERE id = ?', id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    res.json({ message: 'Invoice deleted successfully.' });
  } catch (error) {
    console.error('Error deleting invoice: ', error);
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
}

export async function duplicateInvoice(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();

    // Fetch existing invoice
    const originalInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
    if (!originalInvoice) {
      return res.status(404).json({ error: 'Invoice not found to duplicate.' });
    }

    const originalItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', id);

    // Generate details for the copy
    const invoice_number = await getNextInvoiceNumber(db);
    const secure_hash = crypto.randomBytes(24).toString('hex');
    const today = new Date().toISOString().split('T')[0];

    // Due date: set it to original duration or default to +14 days
    const origIssue = new Date(originalInvoice.issue_date);
    const origDue = new Date(originalInvoice.due_date);
    const durationMs = origDue.getTime() - origIssue.getTime();
    const newDueDate = new Date(Date.now() + (durationMs > 0 ? durationMs : 14 * 24 * 60 * 60 * 1000))
      .toISOString().split('T')[0];

    await db.run('BEGIN TRANSACTION');

    // Create new clone
    const result = await db.run(`
      INSERT INTO invoices (
        invoice_number, customer_id, issue_date, due_date, currency, 
        status, subtotal, tax_rate, tax_amount, grand_total, notes, secure_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_number,
      originalInvoice.customer_id,
      today,
      newDueDate,
      originalInvoice.currency,
      'draft', // Set back to draft
      originalInvoice.subtotal,
      originalInvoice.tax_rate,
      originalInvoice.tax_amount,
      originalInvoice.grand_total,
      originalInvoice.notes,
      secure_hash
    ]);

    const newInvoiceId = result.lastID;

    // Clone items
    for (const item of originalItems) {
      await db.run(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `, [newInvoiceId, item.description, item.quantity, item.unit_price, item.total]);
    }

    await db.run('COMMIT');

    const duplicatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', newInvoiceId);
    const duplicatedItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', newInvoiceId);

    res.status(201).json({ ...duplicatedInvoice, items: duplicatedItems });
  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    console.error('Error duplicating invoice: ', error);
    res.status(500).json({ error: 'Failed to duplicate invoice.' });
  }
}

export async function markPaid(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const result = await db.run("UPDATE invoices SET status = 'paid' WHERE id = ?", id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    res.json({ message: 'Invoice marked as paid.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
}

export async function sendInvoiceEmail(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const db = await getDb();

    // Fetch details
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', invoice.customer_id);
    const company = await db.get('SELECT * FROM company_settings LIMIT 1');
    const items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', id);

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice, customer, company, items);

    // Build public page link
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const invoiceLink = `${appUrl}/invoice/${invoice.secure_hash}`;

    // Compile email
    const subject = `Invoice ${invoice.invoice_number} from ${company.company_name}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${customer.contact_name},</p>
        <p>We appreciate your business! Please find attached the PDF invoice <strong>${invoice.invoice_number}</strong> from <strong>${company.company_name}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="font-weight: bold; color: #374151;">Due Date:</td>
              <td style="color: #4b5563; text-align: right;">${invoice.due_date}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; color: #374151;">Total Due:</td>
              <td style="color: #4f46e5; font-weight: bold; text-align: right;">${invoice.currency} ${invoice.grand_total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <p style="margin-bottom: 25px;">You can view the invoice online and complete payment securely via PayPal using the link below:</p>
        
        <p style="text-align: center; margin-bottom: 25px;">
          <a href="${invoiceLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View & Pay Invoice
          </a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 12px; color: #6b7280;">If you have any questions, please contact us at ${company.phone}.</p>
      </div>
    `;

    const success = await sendEmail({
      to: customer.email,
      subject,
      html,
      attachments: [{
        filename: `${invoice.invoice_number}.pdf`,
        content: pdfBuffer
      }]
    });

    if (success) {
      // Update invoice status from draft to sent if it's currently draft
      if (invoice.status === 'draft') {
        await db.run("UPDATE invoices SET status = 'sent' WHERE id = ?", id);
      }
      res.json({ message: 'Invoice emailed successfully.' });
    } else {
      res.status(500).json({ error: 'Nodemailer SMTP not configured or failed to send email. Check settings or environment variables.' });
    }
  } catch (error: any) {
    console.error('Error emailing invoice: ', error);
    res.status(500).json({ error: error.message || 'Failed to email invoice.' });
  }
}
