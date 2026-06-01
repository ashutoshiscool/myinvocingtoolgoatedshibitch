"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../models/db");
async function getSettings(req, res) {
    try {
        const db = await (0, db_1.getDb)();
        const settings = await db.get(`
      SELECT 
        id, admin_username, company_name, address, phone, 
        registration_code, director_name, logo_url, 
        default_currency, default_tax_rate, smtp_host, 
        smtp_port, smtp_user, smtp_from 
      FROM company_settings LIMIT 1
    `);
        res.json(settings);
    }
    catch (error) {
        console.error('Error fetching settings: ', error);
        res.status(500).json({ error: 'Failed to retrieve company settings.' });
    }
}
async function updateSettings(req, res) {
    const { admin_username, admin_password, company_name, address, phone, registration_code, director_name, logo_url, default_currency, default_tax_rate, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
    try {
        const db = await (0, db_1.getDb)();
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
            const salt = await bcryptjs_1.default.genSalt(10);
            updatedPasswordHash = await bcryptjs_1.default.hash(admin_password, salt);
        }
        // If SMTP password is not provided, keep the old one
        let finalSmtpPass = currentSettings.smtp_pass;
        if (smtp_pass !== undefined && smtp_pass !== '********' && smtp_pass !== '') {
            finalSmtpPass = smtp_pass;
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
        smtp_from = ?
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
            currentSettings.id
        ]);
        res.json({ message: 'Settings updated successfully.' });
    }
    catch (error) {
        console.error('Error updating settings: ', error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
}
