import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Wallet
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { refreshAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'smtp' | 'paypal' | 'security'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    admin_username: '',
    admin_password: '',
    company_name: '',
    address: '',
    phone: '',
    registration_code: '',
    director_name: '',
    logo_url: '',
    default_currency: 'USD',
    default_tax_rate: 0,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    paypal_mode: 'simulation',
    paypal_client_id: '',
    paypal_client_secret: '',
  });

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setFormData({
        ...response.data,
        admin_password: '', // Don't prefill password
        smtp_pass: response.data.smtp_user ? '********' : '', // Placeholder to show it is set
        paypal_client_secret: response.data.paypal_client_id ? '********' : '', // Placeholder to show it is set
      });
    } catch (err) {
      console.error('Failed to load settings', err);
      setMessage({ type: 'error', text: 'Could not fetch company settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'default_tax_rate' || name === 'smtp_port' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.put('/settings', formData);
      setMessage({ type: 'success', text: 'Settings updated successfully.' });
      await refreshAdmin();
      
      // Clear password field
      setFormData(prev => ({ ...prev, admin_password: '' }));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save settings.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure company profiles, templates, credentials, and integrations</p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-xl border text-sm transition-all
          ${message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40' 
            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-950/40'
          }
        `}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center space-x-2 pb-3 text-sm font-semibold border-b-2 transition-all
            ${activeTab === 'company' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-350'
            }
          `}
        >
          <Building2 className="w-4 h-4" />
          <span>Company profile</span>
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center space-x-2 pb-3 text-sm font-semibold border-b-2 transition-all
            ${activeTab === 'smtp' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-350'
            }
          `}
        >
          <Mail className="w-4 h-4" />
          <span>SMTP Email config</span>
        </button>

        <button
          onClick={() => setActiveTab('paypal')}
          className={`flex items-center space-x-2 pb-3 text-sm font-semibold border-b-2 transition-all
            ${activeTab === 'paypal' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-350'
            }
          `}
        >
          <Wallet className="w-4 h-4" />
          <span>PayPal Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 pb-3 text-sm font-semibold border-b-2 transition-all
            ${activeTab === 'security' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-350'
            }
          `}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Auth</span>
        </button>
      </div>

      {/* Forms content */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        
        {activeTab === 'company' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Registration Code (Optional)</label>
                <input
                  type="text"
                  name="registration_code"
                  value={formData.registration_code || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Director Name (Optional)</label>
                <input
                  type="text"
                  name="director_name"
                  value={formData.director_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Company Logo URL</label>
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Default Currency</label>
                    <select
                      name="default_currency"
                      value={formData.default_currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      name="default_tax_rate"
                      value={formData.default_tax_rate}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'smtp' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">SMTP Email Settings</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">SMTP credentials are used to send invoice notification emails with attached PDFs to your customers.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">SMTP Host</label>
                <input
                  type="text"
                  name="smtp_host"
                  value={formData.smtp_host || ''}
                  onChange={handleInputChange}
                  placeholder="smtp.mailtrap.io"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">SMTP Port</label>
                <input
                  type="number"
                  name="smtp_port"
                  value={formData.smtp_port || 587}
                  onChange={handleInputChange}
                  placeholder="587"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">SMTP Username</label>
                <input
                  type="text"
                  name="smtp_user"
                  value={formData.smtp_user || ''}
                  onChange={handleInputChange}
                  placeholder="user@provider.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">SMTP Password</label>
                <input
                  type="password"
                  name="smtp_pass"
                  value={formData.smtp_pass || ''}
                  onChange={handleInputChange}
                  placeholder={formData.smtp_user ? '********' : 'Enter SMTP password'}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Sender Email (From)</label>
                <input
                  type="email"
                  name="smtp_from"
                  value={formData.smtp_from || ''}
                  onChange={handleInputChange}
                  placeholder="invoices@mycompany.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

            </div>
          </div>
        )}

        {activeTab === 'paypal' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">PayPal Integration</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Configure your PayPal Sandbox / Production environment or use local Simulation mode.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Payment Gateway Mode</label>
                <select
                  name="paypal_mode"
                  value={formData.paypal_mode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                >
                  <option value="simulation">Simulation Mode (Fully automated, no keys required)</option>
                  <option value="sandbox">Sandbox Mode (PayPal Test Environment)</option>
                  <option value="live">Live Mode (Real Customer Payments)</option>
                </select>
              </div>

              {formData.paypal_mode !== 'simulation' && (
                <>
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl">
                      <p className="text-xs font-bold text-indigo-800 dark:text-indigo-400">ℹ️ PayPal API Key Guidelines</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        To enable real checkouts, do not enter your personal login email/password in the fields below. You must retrieve your <strong>Client ID</strong> and <strong>Secret</strong> from the <a href="https://developer.paypal.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">PayPal Developer Portal</a> under Apps & Credentials.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">PayPal Client ID</label>
                    <input
                      type="text"
                      name="paypal_client_id"
                      value={formData.paypal_client_id || ''}
                      onChange={handleInputChange}
                      placeholder="Enter PayPal Client ID"
                      required={formData.paypal_mode !== 'simulation'}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">PayPal Client Secret</label>
                    <input
                      type="password"
                      name="paypal_client_secret"
                      value={formData.paypal_client_secret || ''}
                      onChange={handleInputChange}
                      placeholder={formData.paypal_client_id ? '********' : 'Enter PayPal Client Secret'}
                      required={formData.paypal_mode !== 'simulation' && !formData.paypal_client_secret}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white font-mono"
                    />
                  </div>
                </>
              )}

              {formData.paypal_mode === 'simulation' && (
                <div className="space-y-1.5 md:col-span-2">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400">⚡ Simulation Mode Enabled</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      All invoices will display a simple <strong>Simulate Sandbox Checkout</strong> button. Customers (or yourself during testing) can complete checkouts in one click with zero network delays or credit card entries. No developer setup or API keys are required.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Admin Username</label>
                <input
                  type="text"
                  name="admin_username"
                  value={formData.admin_username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                />
              </div>

            </div>
          </div>
        )}

        {/* Form Actions Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>

      </form>
      
    </div>
  );
}
