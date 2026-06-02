import { Response } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
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
        smtp_port, smtp_user, smtp_pass, smtp_from,
        smtp_encryption, smtp_from_name,
        paypal_mode, paypal_client_id, paypal_client_secret
      FROM company_settings LIMIT 1
    `);
    
    if (settings) {
      if (settings.paypal_client_secret) {
        settings.paypal_client_secret = '********';
      }
      if (settings.smtp_pass) {
        settings.smtp_pass = '********';
      }
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
    smtp_from_name,
    smtp_encryption,
    paypal_mode,
    paypal_client_id,
    paypal_client_secret,
    site_title,
    favicon_url
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
    if (smtp_pass === '!e') {
      finalSmtpPass = '';
    } else if (smtp_pass !== undefined && smtp_pass !== '********' && smtp_pass !== '') {
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
        smtp_from_name = ?,
        smtp_encryption = ?,
        paypal_mode = ?,
        paypal_client_id = ?,
        paypal_client_secret = ?,
        site_title = ?,
        favicon_url = ?
      WHERE id = ?
    `, [
      updatedUsername,
      updatedPasswordHash,
      company_name || currentSettings.company_name,
      address || currentSettings.address,
      phone !== undefined ? phone : currentSettings.phone,
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
      smtp_from_name !== undefined ? smtp_from_name : currentSettings.smtp_from_name,
      smtp_encryption !== undefined ? smtp_encryption : currentSettings.smtp_encryption,
      paypal_mode || currentSettings.paypal_mode || 'simulation',
      paypal_client_id !== undefined ? paypal_client_id : currentSettings.paypal_client_id,
      finalPaypalSecret,
      site_title !== undefined ? site_title : currentSettings.site_title,
      favicon_url !== undefined ? favicon_url : currentSettings.favicon_url,
      currentSettings.id
    ]);

    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Error updating settings: ', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
}

export async function testEmailSettings(req: AuthenticatedRequest, res: Response) {
  const {
    smtp_host,
    smtp_port,
    smtp_encryption,
    smtp_user,
    smtp_pass,
    smtp_from,
    smtp_from_name,
    recipient_email
  } = req.body;

  if (!smtp_host || !smtp_from || !recipient_email) {
    return res.status(400).json({ error: 'Missing required SMTP or recipient parameters.' });
  }

  try {
    const db = await getDb();
    
    // Resolve password if masked (********)
    let finalSmtpPass = smtp_pass;
    if (smtp_pass === '********') {
      const currentSettings = await db.get('SELECT smtp_pass FROM company_settings LIMIT 1');
      finalSmtpPass = currentSettings?.smtp_pass;
    } else if (smtp_pass === '!e') {
      finalSmtpPass = '';
    }

    const host = smtp_host;
    const port = Number(smtp_port || 25);
    const user = smtp_user;
    const pass = finalSmtpPass;
    const fromAddress = smtp_from;
    const fromName = smtp_from_name;
    const encryption = smtp_encryption || 'none';

    const secure = encryption.toLowerCase() === 'ssl' || encryption.toLowerCase() === 'tls' || encryption.toLowerCase() === 'ssl/tls';

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const formattedFrom = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

    const mailOptions = {
      from: formattedFrom,
      to: recipient_email,
      subject: 'Test Email from Lumor Pay',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">SMTP Settings Test</h2>
          <p>Hello,</p>
          <p>This is a test email sent from <strong>Lumor Pay</strong> to verify your SMTP configuration.</p>
          <p>If you received this message, your SMTP settings are working perfectly!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="font-weight: bold; color: #374151; width: 40%;">SMTP Host:</td>
                <td style="color: #4b5563;">${host}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #374151;">SMTP Port:</td>
                <td style="color: #4b5563;">${port}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #374151;">Encryption:</td>
                <td style="color: #4b5563;">${encryption}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #374151;">Mail From Name:</td>
                <td style="color: #4b5563;">${fromName || 'None'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #374151;">Mail From Address:</td>
                <td style="color: #4b5563;">${fromAddress}</td>
              </tr>
            </table>
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Sent by Lumor Pay SMTP configuration tester.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Test email sent successfully!' });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email. Please verify settings.' });
  }
}
