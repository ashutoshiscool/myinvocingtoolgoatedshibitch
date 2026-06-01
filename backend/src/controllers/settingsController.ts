import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const db = await getDb();
    const settings = await db.get(`
      SELECT 
        id, admin_username, company_name, address, phone, 
        registration_code, director_name, logo_url, 
        default_currency, default_tax_rate, smtp_host, 
        smtp_port, smtp_user, smtp_from,
        paypal_mode, paypal_client_id, paypal_client_secret
      FROM company_settings LIMIT 1
    `);
    
    if (settings && settings.paypal_client_secret) {
      settings.paypal_client_secret = '********';
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings: ', error);
    res.status(500).json({ error: 'Failed to retrieve company settings.' });
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const {
    admin_username,
    admin_password,
    company_name,
    address,
    phone,
    registration_code,
    director_name,
    logo_url,
    default_currency,
    default_tax_rate,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    smtp_from,
    paypal_mode,
    paypal_client_id,
    paypal_client_secret
  } = req.body;

  try {
    const db = await getDb();
    const currentSettings = await db.get('SELECT * FROM company_settings LIMIT 1');

    if (!currentSettings) {
      return res.status(500).json({ error: 'Company settings not found.' });
    }

    // Determine admin username and password hash updates
    let updatedUsername = currentSettings.admin_username;
    let updatedPasswordHash = currentSettings.admin_password_hash;

    if (admin_username && admin_username.trim() !== '') {
      updatedUsername = admin_username;
    }

    if (admin_password && admin_password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updatedPasswordHash = await bcrypt.hash(admin_password, salt);
    }

    // If SMTP password is not provided, keep the old one
    let finalSmtpPass = currentSettings.smtp_pass;
    if (smtp_pass !== undefined && smtp_pass !== '********' && smtp_pass !== '') {
      finalSmtpPass = smtp_pass;
    }

    // If PayPal client secret is not provided, keep the old one
    let finalPaypalSecret = currentSettings.paypal_client_secret;
    if (paypal_client_secret !== undefined && paypal_client_secret !== '********' && paypal_client_secret !== '') {
      finalPaypalSecret = paypal_client_secret;
    }

    await db.run(`
      UPDATE company_settings
      SET 
        admin_username = ?,
        admin_password_hash = ?,
        company_name = ?,
        address = ?,
        phone = ?,
        registration_code = ?,
        director_name = ?,
        logo_url = ?,
        default_currency = ?,
        default_tax_rate = ?,
        smtp_host = ?,
        smtp_port = ?,
        smtp_user = ?,
        smtp_pass = ?,
        smtp_from = ?,
        paypal_mode = ?,
        paypal_client_id = ?,
        paypal_client_secret = ?
      WHERE id = ?
    `, [
      updatedUsername,
      updatedPasswordHash,
      company_name || currentSettings.company_name,
      address || currentSettings.address,
      phone || currentSettings.phone,
      registration_code !== undefined ? registration_code : currentSettings.registration_code,
      director_name !== undefined ? director_name : currentSettings.director_name,
      logo_url !== undefined ? logo_url : currentSettings.logo_url,
      default_currency || currentSettings.default_currency,
      default_tax_rate !== undefined ? Number(default_tax_rate) : currentSettings.default_tax_rate,
      smtp_host !== undefined ? smtp_host : currentSettings.smtp_host,
      smtp_port !== undefined ? Number(smtp_port) : currentSettings.smtp_port,
      smtp_user !== undefined ? smtp_user : currentSettings.smtp_user,
      finalSmtpPass,
      smtp_from !== undefined ? smtp_from : currentSettings.smtp_from,
      paypal_mode || currentSettings.paypal_mode || 'simulation',
      paypal_client_id !== undefined ? paypal_client_id : currentSettings.paypal_client_id,
      finalPaypalSecret,
      currentSettings.id
    ]);

    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Error updating settings: ', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
}
