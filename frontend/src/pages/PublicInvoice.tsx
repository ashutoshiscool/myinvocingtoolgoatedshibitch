import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { 
  Download, 
  CreditCard, 
  CheckCircle, 
  ShieldAlert,
  Wallet,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

interface InvoiceData {
  invoice: {
    id: number;
    invoice_number: string;
    customer_id: number;
    customer_name: string;
    customer_contact: string;
    customer_email: string;
    customer_address: string;
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
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  company: {
    company_name: string;
    address: string;
    phone: string;
    registration_code?: string;
    director_name?: string;
    logo_url?: string;
  };
  transactions: Array<{
    id: number;
    paypal_order_id: string;
    amount: number;
    currency: string;
    status: string;
    payment_date: string;
  }>;
  paypalClientId?: string;
  hasPaypalKeys?: boolean;
}

export default function PublicInvoice() {
  const { secure_hash } = useParams<{ secure_hash: string }>();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/public/invoices/${secure_hash}`);
      setData(response.data);
      
      // Let's attempt to check if PayPal Client ID is available.
      // In a real app we can load it from a public settings endpoint or config.
      // If we don't have PayPal keys configured, we'll offer simulated checkout.
    } catch (err: any) {
      console.error(err);
      setPageError('Invoice not found or invalid link. Please verify the URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [secure_hash]);

  const handleSimulatePayment = async () => {
    if (!data) return;
    setIsSimulating(true);
    setPaymentError(null);

    try {
      // 1. Create order
      const orderRes = await axios.post(`${API_BASE_URL}/public/invoices/${secure_hash}/paypal-order`);
      const orderId = orderRes.data.id;
      const isMock = orderRes.data.isMock;

      // 2. Capture order
      await axios.post(`${API_BASE_URL}/public/invoices/${secure_hash}/paypal-capture`, {
        orderId,
        isMock
      });

      setPaymentSuccess(true);
      await fetchInvoice();
    } catch (err: any) {
      console.error(err);
      setPaymentError('Simulated payment failed. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Loading Invoice Summary...</p>
      </div>
    );
  }

  if (pageError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Invoice Link</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{pageError || 'This link may have expired or is incorrect.'}</p>
          <p className="text-xs text-slate-400">If you believe this is an error, please contact the business administrator directly.</p>
        </div>
      </div>
    );
  }

  const { invoice, items, company, transactions } = data;
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 md:px-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Page Actions Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Secure Billing Page</span>
          </div>
          
          <a
            href={`${API_BASE_URL}/public/invoices/${secure_hash}/pdf`}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Invoice PDF</span>
          </a>
        </div>

        {/* Global Notifications */}
        {paymentSuccess && (
          <div className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-sm rounded-xl border border-emerald-200/20 shadow-sm">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">Payment Completed!</p>
              <p className="text-xs opacity-90">Thank you! Your transaction has been recorded and the invoice is fully settled.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Invoice Receipt Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
            
            {/* Logo and company detail */}
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                {company.logo_url && (
                  <img 
                    src={company.logo_url} 
                    alt="Company Logo" 
                    className="w-16 h-16 rounded-xl object-contain border border-slate-200 dark:border-slate-800 bg-white p-1"
                  />
                )}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{company.company_name}</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">{company.address}</p>
                  <p className="text-[11px] text-slate-500">Phone: {company.phone}</p>
                  {(company.registration_code || company.director_name) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {company.registration_code && <span>Reg Code: {company.registration_code}</span>}
                      {company.director_name && <span>Director: {company.director_name}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Code</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{invoice.invoice_number}</p>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border
                  ${isPaid ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-950/50' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-950/50'}
                `}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Bill To & Dates Block */}
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 dark:border-slate-800/60 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoiced To:</p>
                <p className="font-bold text-slate-800 dark:text-slate-300">{invoice.customer_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">{invoice.customer_address}</p>
                <p className="text-xs text-slate-500">Email: {invoice.customer_email}</p>
              </div>

              <div className="space-y-3 sm:text-right">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Issued</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-300">{invoice.issue_date}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-300">{invoice.due_date}</p>
                </div>
              </div>
            </div>

            {/* Table block */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="px-8 py-4">Item Details</th>
                    <th className="px-4 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-8 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-8 py-4 font-medium text-slate-900 dark:text-white">
                        {item.description}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-350">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                        {invoice.currency} {item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-8 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {invoice.currency} {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom summary block */}
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Notes */}
              <div>
                {invoice.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Instructions:</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Math Totals */}
              <div className="space-y-2 text-right max-w-xs ml-auto w-full">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.currency} {invoice.tax_amount.toFixed(2)}</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-800" />
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span>{invoice.currency} {invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>

            </div>

          </div>

          {/* Checkout/Payments Action Drawer (1 col) */}
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Settlement</span>
              </h2>

              {isPaid ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/20 p-4 rounded-xl text-center space-y-3">
                  <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <div>
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">Invoice Settled</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">This invoice was marked paid. No further payments are required.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Balance Due</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {invoice.currency} {invoice.grand_total.toFixed(2)}
                    </p>
                  </div>

                  {/* PayPal checkout block */}
                  <div className="space-y-3">
                    <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider text-center">Secure Payment Gateways</p>
                    
                    {paymentError && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900/30">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {/* Simulated payments triggers */}
                    <button
                      onClick={handleSimulatePayment}
                      disabled={isSimulating}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                    >
                      {isSimulating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Simulate Sandbox Checkout</span>
                        </>
                      )}
                    </button>
                    
                    {!data.hasPaypalKeys ? (
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2 mt-2">
                        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">PayPal Simulation Mode</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Standard PayPal buttons are disabled because the admin has not configured PayPal credentials. Please use the <strong className="text-amber-600 dark:text-amber-400">Simulate Sandbox Checkout</strong> button above to complete and test this payment flow.
                        </p>
                        <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/50 mt-1 leading-normal">
                          <strong>Admin Instruction:</strong> Add <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded text-indigo-500 font-mono text-[9px]">PAYPAL_CLIENT_ID</code> and <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded text-indigo-500 font-mono text-[9px]">PAYPAL_CLIENT_SECRET</code> to your root <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded font-mono text-[9px]">.env</code> file, then restart the server to enable real PayPal buttons.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-center py-1">
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">Or pay using PayPal Sandbox Integration:</span>
                        </div>

                        {/* PayPal scripts buttons */}
                        <PayPalScriptProvider options={{ clientId: data.paypalClientId || "test" }}>
                          <PayPalButtons
                            style={{ layout: "vertical", height: 38 }}
                            createOrder={async () => {
                              setPaymentError(null);
                              try {
                                const res = await axios.post(`${API_BASE_URL}/public/invoices/${secure_hash}/paypal-order`);
                                return res.data.id;
                              } catch (err: any) {
                                setPaymentError('PayPal setup is not fully active. Use the simulation bypass button above.');
                                throw err;
                              }
                            }}
                            onApprove={async (data) => {
                              try {
                                await axios.post(`${API_BASE_URL}/public/invoices/${secure_hash}/paypal-capture`, {
                                  orderId: data.orderID,
                                  isMock: false
                                });
                                setPaymentSuccess(true);
                                await fetchInvoice();
                              } catch (err) {
                                setPaymentError('Could not process transaction captures.');
                              }
                            }}
                            onError={() => {
                              setPaymentError('PayPal payment encountered a connection issue.');
                            }}
                          />
                        </PayPalScriptProvider>
                      </>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* Transaction audit log for customer */}
            {transactions.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Transaction History</h3>
                <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="pt-2 text-xs flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-350">PayPal Payment</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(tx.payment_date).toLocaleString()}</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {tx.currency} {tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
