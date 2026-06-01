"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../models/db");
const JWT_SECRET = process.env.JWT_SECRET || 'lumor_pay_super_secret_jwt_key_12345';
const JWT_EXPIRES_IN = '7d';
async function login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const db = await (0, db_1.getDb)();
        const settings = await db.get('SELECT * FROM company_settings LIMIT 1');
        if (!settings) {
            return res.status(500).json({ error: 'System is not configured yet.' });
        }
        if (settings.admin_username !== username) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, settings.admin_password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        // Sign JWT
        const token = jsonwebtoken_1.default.sign({ username: settings.admin_username, id: settings.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            token,
            admin: {
                username: settings.admin_username,
                company_name: settings.company_name
            }
        });
    }
    catch (error) {
        console.error('Login error: ', error);
        res.status(500).json({ error: 'An error occurred during login.' });
    }
}
async function getMe(req, res) {
    const adminReq = req;
    if (!adminReq.admin) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    try {
        const db = await (0, db_1.getDb)();
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
    }
    catch (error) {
        res.status(500).json({ error: 'Could not fetch admin settings.' });
    }
}
