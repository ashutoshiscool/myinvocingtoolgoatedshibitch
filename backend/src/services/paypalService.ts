import axios from 'axios';
import { getDb } from '../models/db';

export interface PaypalConfig {
  mode: 'simulation' | 'sandbox' | 'live';
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export async function getPaypalConfig(): Promise<PaypalConfig> {
  try {
    const db = await getDb();
    const settings = await db.get('SELECT paypal_mode, paypal_client_id, paypal_client_secret FROM company_settings LIMIT 1');
    
    const mode = (settings?.paypal_mode || process.env.PAYPAL_MODE || 'simulation') as 'simulation' | 'sandbox' | 'live';
    const clientId = settings?.paypal_client_id || process.env.PAYPAL_CLIENT_ID || '';
    const clientSecret = settings?.paypal_client_secret || process.env.PAYPAL_CLIENT_SECRET || '';
    
    const baseUrl = mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
      
    return { mode, clientId, clientSecret, baseUrl };
  } catch (err) {
    console.error('Error fetching PayPal config from DB, falling back to process.env: ', err);
    const mode = (process.env.PAYPAL_MODE || 'simulation') as 'simulation' | 'sandbox' | 'live';
    const clientId = process.env.PAYPAL_CLIENT_ID || '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    const baseUrl = mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    return { mode, clientId, clientSecret, baseUrl };
  }
}

async function getAccessToken(config: PaypalConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('PayPal Client ID or Secret is not configured.');
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await axios({
    url: `${config.baseUrl}/v1/oauth2/token`,
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

export async function createPaypalOrder(amount: number, currency: string, invoiceNumber: string) {
  const config = await getPaypalConfig();
  const token = await getAccessToken(config);
  const response = await axios({
    url: `${config.baseUrl}/v2/checkout/orders`,
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

export async function capturePaypalOrder(orderId: string) {
  const config = await getPaypalConfig();
  const token = await getAccessToken(config);
  const response = await axios({
    url: `${config.baseUrl}/v2/checkout/orders/${orderId}/capture`,
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data;
}
