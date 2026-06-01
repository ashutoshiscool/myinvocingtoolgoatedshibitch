"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaypalOrder = createPaypalOrder;
exports.capturePaypalOrder = capturePaypalOrder;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // sandbox or live
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
async function getAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal Client ID or Secret is not configured in .env');
    }
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await (0, axios_1.default)({
        url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: 'grant_type=client_credentials'
    });
    return response.data.access_token;
}
async function createPaypalOrder(amount, currency, invoiceNumber) {
    const token = await getAccessToken();
    const response = await (0, axios_1.default)({
        url: `${PAYPAL_BASE_URL}/v2/checkout/orders`,
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        data: {
            intent: 'CAPTURE',
            purchase_units: [{
                    reference_id: invoiceNumber,
                    amount: {
                        currency_code: currency,
                        value: amount.toFixed(2)
                    }
                }]
        }
    });
    return response.data;
}
async function capturePaypalOrder(orderId) {
    const token = await getAccessToken();
    const response = await (0, axios_1.default)({
        url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
}
