import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../models/db';

const JWT_SECRET = process.env.JWT_SECRET || 'lumor_pay_super_secret_jwt_key_12345';
const JWT_EXPIRES_IN = '7d';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const db = await getDb();
    const settings = await db.get('SELECT * FROM company_settings LIMIT 1');

    if (!settings) {
      return res.status(500).json({ error: 'System is not configured yet.' });
    }

    if (settings.admin_username !== username) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, settings.admin_password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { username: settings.admin_username, id: settings.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: {
        username: settings.admin_username,
        company_name: settings.company_name
      }
    });
  } catch (error) {
    console.error('Login error: ', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
}

export async function getMe(req: Request, res: Response) {
  const adminReq = req as any;
  if (!adminReq.admin) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const db = await getDb();
    const settings = await db.get('SELECT id, admin_username, company_name, default_currency, default_tax_rate, logo_url FROM company_settings LIMIT 1');
    res.json({
      admin: {
        username: settings.admin_username,
        company_name: settings.company_name,
        default_currency: settings.default_currency,
        default_tax_rate: settings.default_tax_rate,
        logo_url: settings.logo_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch admin settings.' });
  }
}
