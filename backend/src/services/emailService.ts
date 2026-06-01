import nodemailer from 'nodemailer';
import { getDb } from '../models/db';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const db = await getDb();
  const settings = await db.get('SELECT * FROM company_settings LIMIT 1');

  // Determine SMTP config (Database settings take precedence over environment variables)
  const host = settings?.smtp_host || process.env.SMTP_HOST;
  const port = Number(settings?.smtp_port || process.env.SMTP_PORT || 587);
  const user = settings?.smtp_user || process.env.SMTP_USER;
  const pass = settings?.smtp_pass || process.env.SMTP_PASS;
  const from = settings?.smtp_from || process.env.SMTP_FROM || 'invoices@lumorpay.local';

  if (!host || !user || !pass) {
    console.warn('SMTP parameters are not fully configured. Email was not sent.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });

  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
}
