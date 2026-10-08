import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import WorkspaceHero from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const pageSize = 10;

export default function Transactions() {
  const { user } = useAuth();
  const toast = useToast();
  const currentUserId = user._id || user.id;
  const [transactions, setTransactions] = useState([]);
  const [confirmedMatches, setConfirmedMatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlingId, setSettlingId] = useState('');

  const loadTransactions = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/transactions', { params: { page, limit: pageSize } });
      setTransactions(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfirmedMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/matching/matches', { params: { status: 'confirmed', page: 1, limit: 100 } });
      setConfirmedMatches(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load confirmed matches.');
    }
  }, []);

  useEffect(() => {
    loadTransactions(1);
    if (user.role === 'admin') loadConfirmedMatches();
  }, [loadTransactions, loadConfirmedMatches, user.role]);

  const settleMatch = async match => {
    setSettlingId(match._id);
    try {
      await api.post(`/transactions/settle/${match._id}`);
      toast('Match settled and transaction recorded.');
      await Promise.all([loadTransactions(pagination.page), loadConfirmedMatches()]);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to settle this match.', 'error');
    } finally {
      setSettlingId('');
    }
  };

  const columns = [
    { key: 'createdAt', label: 'Date', render: value => new Date(value).toLocaleString() },
    {
      key: 'seller',
      label: 'Trading partner',
      render: (_, transaction) => {
        const partner = String(transaction.seller?._id) === String(currentUserId)
          ? transaction.buyer
          : transaction.seller;
        return partner?.name || '—';
      }
    },
    { key: 'deliveredKwh', label: 'Energy', render: value => `${value} kWh` },
    { key: 'amount', label: 'Amount', render: value => `$${Number(value).toFixed(2)}` },
    { key: 'fee', label: 'Platform fee', render: value => `$${Number(value).toFixed(2)}` },
    { key: 'status', label: 'Status', render: value => <span className="capitalize">{value}</span> },
    { key: '_id', label: 'Reference', render: value => value.slice(-8) }
  ];

  const settlementColumns = [
    { key: 'seller', label: 'Seller', render: value => value?.name || '—' },
    { key: 'buyer', label: 'Buyer', render: value => value?.name || '—' },
    { key: 'quantityKwh', label: 'Energy', render: value => `${value} kWh` },
    { key: 'pricePerKwh', label: 'Price', render: value => `$${Number(value).toFixed(3)} / kWh` },
    { key: 'createdAt', label: 'Confirmed', render: value => new Date(value).toLocaleString() },
    { key: 'actions', label: 'Settlement', render: (_, match) => <button type="button" disabled={settlingId === match._id} onClick={() => settleMatch(match)} className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{settlingId === match._id ? 'Settling…' : 'Settle'}</button> }
  ];

  return (
    <div className="space-y-6">
    <WorkspaceHero
      variant="transaction"
      eyebrow="TRADE HISTORY"
      title="Transactions"
      description="A clear record of energy delivered, payments, and completed trades."
    />
    {user.role === 'admin' && (
      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">SETTLEMENT QUEUE</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Confirmed matches</h2><p className="mt-1 text-xs text-muted">Settlement transfers funds and records a transaction; it cannot be undone.</p></div>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={loadConfirmedMatches} /></div>}
        <DataTable columns={settlementColumns} data={confirmedMatches} emptyMessage="No confirmed matches are awaiting settlement." />
      </section>
    )}
    <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">TRADE HISTORY</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Transactions</h2>
      </div>
      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadTransactions(pagination.page)} /></div>}
      <DataTable columns={columns} data={transactions} loading={loading} pagination={pagination} onPageChange={loadTransactions} emptyMessage="No transactions yet." />
    </section>
    </div>
  );
}
