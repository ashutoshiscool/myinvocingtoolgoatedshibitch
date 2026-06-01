import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, Plus, Search, Filter, Trash2, Edit3, Copy, CheckCircle, 
  Download, Link as LinkIcon, AlertCircle, PlusCircle, MinusCircle, 
  ArrowLeft, CheckCircle2, Send
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: number;
  company_name: string;
}

interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_contact?: string;
  customer_email?: string;
  customer_address?: string;
  customer_phone?: string;
  issue_date: string;
  due_date: string;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  notes?: string;
  secure_hash: string;
  items?: InvoiceItem[];
}

export default function Invoices() {
  const { admin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');
  const isCreate = searchParams.get('create') === 'true';
  const isEdit = searchParams.get('edit') === 'true';

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Selected Invoice Detail State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formFields, setFormFields] = useState({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: admin?.default_currency || 'USD',
    tax_rate: admin?.default_tax_rate || 0,
    notes: '',
  });
  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Load Invoices & Customers list
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [invRes, custRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers')
      ]);
      setInvoices(invRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load invoice records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sync Default details when admin changes
  useEffect(() => {
    if (admin && !invoiceId && isCreate) {
      setFormFields(prev => ({
        ...prev,
        currency: admin.default_currency,
        tax_rate: admin.default_tax_rate,
      }));
    }
  }, [admin, isCreate, invoiceId]);

  // Load Detailed Single Invoice if ID parameter changes
  useEffect(() => {
    if (invoiceId) {
      loadDetailedInvoice(invoiceId);
    } else {
      setSelectedInvoice(null);
    }
  }, [invoiceId, isEdit]);

  const loadDetailedInvoice = async (id: string) => {
    try {
      setDetailLoading(true);
      setError(null);
      const response = await api.get(`/invoices/${id}`);
      setSelectedInvoice(response.data);
      
      // If we are in edit mode, populate the form
      if (isEdit) {
        const inv = response.data;
        setFormFields({
          customer_id: inv.customer_id.toString(),
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          currency: inv.currency,
          tax_rate: inv.tax_rate,
          notes: inv.notes || '',
        });
        setFormItems(inv.items || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve detailed invoice info.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Calculations for subtotal, tax and grand total
  const calculatedSubtotal = formItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const calculatedTaxAmount = (calculatedSubtotal * formFields.tax_rate) / 100;
  const calculatedGrandTotal = calculatedSubtotal + calculatedTaxAmount;

  // Form handlers
  const handleFormFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: name === 'tax_rate' ? Number(value) : value
    }));
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      
      if (name === 'quantity') item.quantity = Number(value) || 0;
      else if (name === 'unit_price') item.unit_price = Number(value) || 0;
      else if (name === 'description') item.description = value;
      
      item.total = item.quantity * item.unit_price;
      updated[index] = item;
      return updated;
    });
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.customer_id) {
      alert('Please select a customer.');
      return;
    }
    
    // Check item rows
    const validItems = formItems.filter(item => item.description.trim() !== '');
    if (validItems.length === 0) {
      alert('Please add at least one item with a description.');
      return;
    }

    setActionLoading(true);
    setError(null);

    const payload = {
      ...formFields,
      customer_id: Number(formFields.customer_id),
      items: validItems
    };

    try {
      if (isEdit && invoiceId) {
        await api.put(`/invoices/${invoiceId}`, { ...payload, status: selectedInvoice?.status });
        setSuccessMsg('Invoice updated successfully.');
      } else {
        const response = await api.post('/invoices', payload);
        setSearchParams({ id: response.data.id.toString() });
        setSuccessMsg('Invoice created successfully.');
      }
      await fetchInitialData();
      
      // Auto close success notification after 4s
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save invoice.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Action Triggers
  const handleDuplicate = async (id: number) => {
    if (!window.confirm('Duplicate this invoice?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/invoices/${id}/duplicate`);
      setSearchParams({ id: res.data.id.toString() });
      setSuccessMsg('Invoice duplicated successfully! A draft has been created.');
      await fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    setActionLoading(true);
    try {
      await api.post(`/invoices/${id}/mark-paid`);
      setSuccessMsg('Invoice marked as paid.');
      await loadDetailedInvoice(id.toString());
      await fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to mark invoice as paid.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async (id: number) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/invoices/${id}/send-email`);
      setSuccessMsg('Invoice PDF sent to customer successfully.');
      await loadDetailedInvoice(id.toString());
      await fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'SMTP configs missing. Please setup your SMTP details in Settings to email invoices.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/invoices/${id}`);
      setSearchParams({});
      await fetchInitialData();
    } catch (err) {
      alert('Failed to delete invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter invoices list
  const filteredInvoices = invoices.filter(inv => {
    const matchesCustomer = filterCustomer === '' || inv.customer_name?.toLowerCase().includes(filterCustomer.toLowerCase()) || inv.customer_contact?.toLowerCase().includes(filterCustomer.toLowerCase());
    const matchesStatus = filterStatus === '' || inv.status === filterStatus;
    const matchesCurrency = filterCurrency === '' || inv.currency === filterCurrency;
    const matchesDate = filterDate === '' || inv.issue_date === filterDate;
    return matchesCustomer && matchesStatus && matchesCurrency && matchesDate;
  });

  // Unique list of currencies in system for filters
  const uniqueCurrencies = Array.from(new Set(invoices.map(inv => inv.currency)));

  // Public invoice shareable URL compiler
  const getPublicInvoiceUrl = (hash: string) => {
    const base = window.location.origin;
    return `${base}/invoice/${hash}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Public invoice link copied to clipboard!');
  };

  // RENDER SCENARIO 1: Create or Edit Form
  if (isCreate || (isEdit && invoiceId)) {
    return (
      <div className="space-y-8 animate-fade-in">
        
        {/* Back Link Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => invoiceId ? setSearchParams({ id: invoiceId }) : setSearchParams({})}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isCreate ? 'Create Invoice' : `Edit Invoice ${selectedInvoice?.invoice_number}`}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Specify customer settings, line items, and notes</p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* General Fields (2 cols on large screen) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/60 pb-3">Line Items</h3>
            
            {/* Dynamic Items Table */}
            <div className="space-y-4">
              <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="space-y-3">
                {formItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    
                    {/* Description */}
                    <div className="col-span-6">
                      <input
                        type="text"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, e)}
                        required
                        placeholder="Description of services/products..."
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, e)}
                        required
                        min="1"
                        placeholder="Qty"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        name="unit_price"
                        value={item.unit_price || ''}
                        onChange={(e) => handleItemChange(index, e)}
                        required
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                      />
                    </div>

                    {/* Total & Delete Row */}
                    <div className="col-span-2 flex items-center justify-between pl-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-300">
                        {formFields.currency} {item.total.toFixed(2)}
                      </span>
                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1.5 text-slate-450 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <MinusCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>

              {/* Add row Button */}
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center space-x-1.5 px-4 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all mt-4"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Item Row</span>
              </button>
            </div>

            {/* Notes Section */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes & Payment Terms</label>
              <textarea
                name="notes"
                value={formFields.notes}
                onChange={handleFormFieldChange}
                rows={4}
                placeholder="Specify payment timelines, bank transfer coordinates, or standard notes..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
              />
            </div>

          </div>

          {/* Sidebar / Totals Configuration Panel */}
          <div className="space-y-6">
            
            {/* Invoice Configuration settings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/60 pb-2">Configurations</h3>

              {/* Customer dropdown selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customer *</label>
                <select
                  name="customer_id"
                  value={formFields.customer_id}
                  onChange={handleFormFieldChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                >
                  <option value="">Select a Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.company_name}</option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    No customers found. <Link to="/customers" className="underline font-bold">Add customers first</Link>.
                  </p>
                )}
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Issue Date</label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formFields.issue_date}
                    onChange={handleFormFieldChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formFields.due_date}
                    onChange={handleFormFieldChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Currency & Tax rates selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Currency</label>
                  <select
                    name="currency"
                    value={formFields.currency}
                    onChange={handleFormFieldChange}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tax Rate (%)</label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formFields.tax_rate}
                    onChange={handleFormFieldChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

            </div>

            {/* Calculations Totals Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/60 pb-2">Totals Summary</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-650 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{formFields.currency} {calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-650 dark:text-slate-400">
                  <span>Tax ({formFields.tax_rate}%)</span>
                  <span>{formFields.currency} {calculatedTaxAmount.toFixed(2)}</span>
                </div>
                <hr className="border-slate-100 dark:border-slate-800/60" />
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span>{formFields.currency} {calculatedGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{isEdit ? 'Save Invoice' : 'Generate Invoice'}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </form>

      </div>
    );
  }

  // RENDER SCENARIO 2: Single Invoice Detail View
  if (invoiceId && selectedInvoice) {
    if (detailLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Retrieving details...</p>
        </div>
      );
    }

    const publicUrl = getPublicInvoiceUrl(selectedInvoice.secure_hash);

    return (
      <div className="space-y-8 animate-fade-in">
        
        {/* Detail Header controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchParams({})}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Invoice {selectedInvoice.invoice_number}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border
                  ${selectedInvoice.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-950/50' : ''}
                  ${selectedInvoice.status === 'sent' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-950/50' : ''}
                  ${selectedInvoice.status === 'draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-transparent' : ''}
                  ${selectedInvoice.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-950/50' : ''}
                `}>
                  {selectedInvoice.status}
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Secure hash: {selectedInvoice.secure_hash}</p>
            </div>
          </div>

          {/* Quick Actions Drawer */}
          <div className="flex flex-wrap gap-2.5">
            {/* Mark as paid button */}
            {selectedInvoice.status !== 'paid' && (
              <button
                onClick={() => handleMarkPaid(selectedInvoice.id)}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Paid</span>
              </button>
            )}

            {/* Email customer button */}
            <button
              onClick={() => handleSendEmail(selectedInvoice.id)}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Email Invoice</span>
            </button>

            {/* Print / Download PDF */}
            <a
              href={`${API_BASE_URL}/public/invoices/${selectedInvoice.secure_hash}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-250 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>

            {/* Clone/Duplicate */}
            <button
              onClick={() => handleDuplicate(selectedInvoice.id)}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-250 dark:border-slate-700"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={() => setSearchParams({ id: selectedInvoice.id.toString(), edit: 'true' })}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-150 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-350 dark:border-slate-650"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>

            {/* Delete button */}
            <button
              onClick={() => handleDeleteInvoice(selectedInvoice.id)}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 hover:text-red-700 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-red-100 dark:hover:border-red-950/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Global Notifications inside Details */}
        {successMsg && (
          <div className="flex items-center space-x-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl border border-emerald-100 dark:border-emerald-950/40">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action errors */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-950/20 text-red-750 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-950/40">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Invoice Visual Layout */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Visual Header */}
            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-800/25 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{admin?.company_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From Business Address</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Invoice Code</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedInvoice.invoice_number}</p>
              </div>
            </div>

            {/* Addresses and dates info */}
            <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 dark:border-slate-800/60">
              
              {/* Bill To */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bill To:</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedInvoice.customer_name}</p>
                <p className="text-xs text-slate-650 dark:text-slate-450 leading-relaxed max-w-xs">{selectedInvoice.customer_address}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email: {selectedInvoice.customer_email}</p>
                {selectedInvoice.customer_phone && <p className="text-xs text-slate-500 dark:text-slate-400">Phone: {selectedInvoice.customer_phone}</p>}
              </div>

              {/* Dates and summary info */}
              <div className="space-y-2 sm:text-right">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Issue Date</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{selectedInvoice.issue_date}</p>
                </div>
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due Date</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{selectedInvoice.due_date}</p>
                </div>
              </div>

            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4">Item Description</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {selectedInvoice.items?.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-slate-600 dark:text-slate-350">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-600 dark:text-slate-350">
                        {selectedInvoice.currency} {item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-slate-850 dark:text-slate-200">
                        {selectedInvoice.currency} {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom summary block */}
            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Notes */}
              <div>
                {selectedInvoice.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes & Terms:</p>
                    <p className="text-xs text-slate-650 dark:text-slate-450 leading-relaxed whitespace-pre-wrap">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2.5 text-right max-w-sm ml-auto w-full">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInvoice.currency} {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450">
                  <span>Tax ({selectedInvoice.tax_rate}%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInvoice.currency} {selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-800" />
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span>{selectedInvoice.currency} {selectedInvoice.grand_total.toFixed(2)}</span>
                </div>
              </div>

            </div>

          </div>

          {/* Details Sidebar (Public Link & Integrations) */}
          <div className="space-y-6">
            
            {/* Shareable Link Box */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <LinkIcon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Client Payment Link</span>
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-500">Provide this secure unique link to your customer to view this invoice online and checkout using PayPal.</p>
              
              <div className="space-y-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-350 focus:outline-none"
                />
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(publicUrl)}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Copy Link
                  </button>
                  <a
                    href={`/invoice/${selectedInvoice.secure_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold text-center border border-slate-250 dark:border-slate-700"
                  >
                    View Page
                  </a>
                </div>
              </div>
            </div>

            {/* Payment updates / Transaction Log */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Logs</h3>
              
              {selectedInvoice.status === 'paid' ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/20 text-emerald-800 dark:text-emerald-400 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-bold flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Invoice Fully Paid</span>
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">Payment was completed successfully. Your records show the balance is fully settled.</p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Awaiting Payment</p>
                  <p className="text-[10px] text-slate-400 mt-1">Customers can make credit card or PayPal payments online via the client portal page.</p>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    );
  }

  // RENDER SCENARIO 3: Standard Invoices List Panel
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage billing schedules, drafts, and client payments</p>
        </div>
        <button
          onClick={() => setSearchParams({ create: 'true' })}
          className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Global Errors */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-950/20 text-red-750 dark:text-red-450 text-sm rounded-xl border border-red-150 dark:border-red-900/30">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Drawer Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters & Search</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Customer Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                placeholder="Search name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Currency filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none dark:text-white"
            >
              <option value="">All Currencies</option>
              {uniqueCurrencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-sm mt-3">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-450 dark:text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-750 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No invoices matching filters</p>
            <p className="text-sm text-slate-400 mt-1">Try resetting search parameters or draft a new invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {inv.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {inv.issue_date}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {inv.due_date}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-850 dark:text-slate-200">
                      {inv.currency} {inv.grand_total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                        ${inv.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-950/50' : ''}
                        ${inv.status === 'sent' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-950/50' : ''}
                        ${inv.status === 'draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-transparent' : ''}
                        ${inv.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-950/50' : ''}
                      `}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-1.5">
                      <button
                        onClick={() => setSearchParams({ id: inv.id.toString() })}
                        className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 font-bold text-xs bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-950/50"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
