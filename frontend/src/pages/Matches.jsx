import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import WorkspaceHero from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const pageSize = 10;

export default function Matches() {
  const { user } = useAuth();
  const currentUserId = user._id || user.id;
  const [matches, setMatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const toast = useToast();

  const loadMatches = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/matching/matches', {
        params: { page, limit: pageSize, ...(status ? { status } : {}) }
      });
      setMatches(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load matches.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { loadMatches(1); }, [loadMatches]);

  const actOnMatch = async (match, action) => {
    setBusyId(match._id);
    try {
      await api.post(`/matching/matches/${match._id}/${action}`);
      toast(action === 'confirm' ? 'Match confirmation recorded.' : 'Match rejected.');
      await loadMatches(pagination.page);
    } catch (requestError) {
      toast(requestError.response?.data?.message || `Unable to ${action} match.`, 'error');
    } finally {
      setBusyId('');
    }
  };

  const columns = [
    { key: 'listing', label: 'Listing', render: value => value?._id ? value._id.slice(-8) : '—' },
    { key: 'quantityKwh', label: 'Energy', render: value => `${value} kWh` },
    { key: 'pricePerKwh', label: 'Price', render: value => `$${Number(value).toFixed(3)} / kWh` },
    {
      key: 'buyer',
      label: 'Trading partner',
      render: (_, match) => String(match.seller?._id) === String(currentUserId)
        ? match.buyer?.name || '—'
        : match.seller?.name || '—'
    },
    { key: 'createdAt', label: 'Created', render: value => new Date(value).toLocaleDateString() },
    {
      key: 'status',
      label: 'Status',
      render: (value, match) => (
        <div>
          <span className="capitalize">{value}</span>
          {value === 'pending' && <p className="mt-1 text-[10px] text-muted">You: {(String(match.seller?._id) === String(currentUserId) ? match.sellerConfirmed : match.buyerConfirmed) ? 'confirmed' : 'not confirmed'}</p>}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, match) => match.status === 'pending' ? (
        <div className="flex gap-2">
          <button type="button" disabled={busyId === match._id || (String(match.seller?._id) === String(currentUserId) ? match.sellerConfirmed : match.buyerConfirmed)} onClick={() => actOnMatch(match, 'confirm')} className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
            {(String(match.seller?._id) === String(currentUserId) ? match.sellerConfirmed : match.buyerConfirmed) ? 'Confirmed' : 'Confirm'}
          </button>
          <button type="button" disabled={busyId === match._id} onClick={() => actOnMatch(match, 'reject')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">Reject</button>
        </div>
      ) : '—'
    }
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="match"
        eyebrow="TRADE AGREEMENTS"
        title="Matches"
        description="Review matched energy trades, confirm agreements, and follow their progress."
      />
      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">TRADE AGREEMENTS</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Matches</h2>
        </div>
        <label className="text-xs font-semibold text-ink">Status
          <select value={status} onChange={event => setStatus(event.target.value)} className="form-input mt-1 min-w-40">
            <option value="">All matches</option>
            {['pending', 'confirmed', 'settled', 'rejected', 'disputed'].map(value => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
          </select>
        </label>
      </div>
      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadMatches(pagination.page)} /></div>}
      <DataTable columns={columns} data={matches} loading={loading} pagination={pagination} onPageChange={loadMatches} emptyMessage="No matches found." />
      </section>
    </div>
  );
}
