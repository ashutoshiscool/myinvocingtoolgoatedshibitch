"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
const db_1 = require("../models/db");
async function getStats(req, res) {
    try {
        const db = await (0, db_1.getDb)();
        // 1. Counts
        const totalCount = await db.get('SELECT COUNT(*) as count FROM invoices');
        const paidCount = await db.get("SELECT COUNT(*) as count FROM invoices WHERE status = 'paid'");
        const pendingCount = await db.get("SELECT COUNT(*) as count FROM invoices WHERE status != 'paid'");
        // 2. Revenue grouped by currency
        const revenueRows = await db.all(`
      SELECT SUM(grand_total) as total, currency 
      FROM invoices 
      WHERE status = 'paid' 
      GROUP BY currency
    `);
        // 3. Simple list of recent invoices for the dashboard panel
        const recentInvoices = await db.all(`
      SELECT i.*, c.company_name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ORDER BY i.id DESC
      LIMIT 5
    `);
        // 4. Monthly chart data (sum of grand_total of invoices created per month in default currency)
        // Get company default currency first
        const company = await db.get('SELECT default_currency FROM company_settings LIMIT 1');
        const defaultCurrency = company?.default_currency || 'USD';
        const monthlySales = await db.all(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(grand_total) as sales
      FROM invoices
      WHERE currency = ? AND status = 'paid'
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `, [defaultCurrency]);
        res.json({
            counts: {
                total: totalCount.count || 0,
                paid: paidCount.count || 0,
                pending: pendingCount.count || 0
            },
            revenue: revenueRows,
            recentInvoices,
            monthlySales,
            defaultCurrency
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats: ', error);
        res.status(500).json({ error: 'Failed to compile dashboard statistics.' });
    }
}
