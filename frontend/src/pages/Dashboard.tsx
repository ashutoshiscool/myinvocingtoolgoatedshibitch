import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  Plus
} from 'lucide-react';
import api from '../services/api';

interface StatsData {
  counts: {
    total: number;
    paid: number;
    pending: number;
  };
  revenue: Array<{
    total: number;
    currency: string;
  }>;
  recentInvoices: Array<{
    id: number;
    invoice_number: string;
    customer_name: string;
    issue_date: string;
    due_date: string;
    currency: string;
    grand_total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    secure_hash: string;
  }>;
  monthlySales: Array<{
    month: string;
    sales: number;
  }>;
  defaultCurrency: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats', err);
      setError('Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Compiling statistics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-950/40 text-center">
        <p>{error || 'Something went wrong.'}</p>
        <button 
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get total revenue for dominant currency
  const mainRevenue = stats.revenue.find(r => r.currency === stats.defaultCurrency)?.total || 0;
  
  // Format revenue strings
  const revenueDisplay = stats.revenue.map(r => `${r.currency} ${r.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(', ') || 'N/A';

  // SVG Chart Calculations
  const maxSales = Math.max(...stats.monthlySales.map(s => s.sales), 100);
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 20;

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here is a snapshot of your company invoices</p>
        </div>
        <Link
          to="/invoices?create=true"
          className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Invoices */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.counts.total}</p>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid Invoices</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.counts.paid}</p>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.counts.pending}</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate" title={revenueDisplay}>
              {stats.defaultCurrency} {mainRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts/Sales Trends */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-slate-900 dark:text-white">Revenue Trends ({stats.defaultCurrency})</h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Monthly Sales</span>
          </div>

          <div className="flex-1 min-h-[180px] flex items-center justify-center mt-6">
            {stats.monthlySales.length === 0 ? (
              <p className="text-slate-400 text-sm">No sales data recorded yet.</p>
            ) : (
              <div className="w-full">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                  {/* Grid Lines */}
                  <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
                  <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#94a3b8" strokeWidth="0.5" opacity="0.1" />

                  {/* Render Bars */}
                  {stats.monthlySales.map((s, index) => {
                    const x = padding + (index * (chartWidth - padding * 2)) / stats.monthlySales.length + 10;
                    const barWidth = Math.max(10, (chartWidth - padding * 2) / stats.monthlySales.length - 20);
                    const barHeight = (s.sales / maxSales) * (chartHeight - padding * 2);
                    const y = chartHeight - padding - barHeight;

                    return (
                      <g key={s.month}>
                        {/* Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          fill="url(#indigoGrad)"
                          className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                        />
                        {/* Label */}
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight - 4}
                          fill="#94a3b8"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {s.month.split('-')[1]}/{s.month.split('-')[0].substring(2)}
                        </text>
                        {/* Hover values */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          fill="#4f46e5"
                          className="dark:fill-indigo-400 font-bold"
                          fontSize="8"
                          textAnchor="middle"
                        >
                          {s.sales.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  <defs>
                    <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Multi-currency revenue summaries list */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800/60">Revenue Breakdown</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-4">
              {stats.revenue.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">No cleared revenue yet.</p>
              ) : (
                stats.revenue.map((rev) => (
                  <div key={rev.currency} className="flex justify-between py-3">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{rev.currency} Revenue</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{rev.currency} {rev.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-4 rounded-xl mt-4">
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">Multiple Currencies supported</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Invoices are tracked individually in their selected currency, showing accurate total revenues per denomination.</p>
          </div>
        </div>

      </div>

      {/* Recent Invoices Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Recent Invoices</h2>
          <Link 
            to="/invoices"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-semibold flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {stats.recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            No invoices created yet. Go create your first invoice!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Grand Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {stats.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {inv.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {inv.issue_date}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-850 dark:text-slate-200">
                      {inv.currency} {inv.grand_total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${inv.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-950/50' : ''}
                        ${inv.status === 'sent' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-950/50' : ''}
                        ${inv.status === 'draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : ''}
                        ${inv.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-950/50' : ''}
                      `}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <Link 
                        to={`/invoices?id=${inv.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold text-xs bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-950/50"
                      >
                        View Details
                      </Link>
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
