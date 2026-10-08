import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import WorkspaceHero from '../components/WorkspaceHero';

const pageSize = 10;

export default function Bids() {
  const [bids, setBids] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBids = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/bids/mine', {
        params: { page, limit: pageSize, ...(status ? { status } : {}) }
      });
      setBids(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your bids.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { loadBids(1); }, [loadBids]);

  const columns = [
    { key: '_id', label: 'Bid', render: value => value.slice(-8) },
    { key: 'quantityKwh', label: 'Quantity', render: (value, bid) => `${value} kWh (${bid.remainingKwh} remaining)` },
    { key: 'maxPricePerKwh', label: 'Maximum price', render: value => `$${Number(value).toFixed(3)} / kWh` },
    { key: 'zone', label: 'Zone' },
    { key: 'windowStart', label: 'Delivery window', render: (value, bid) => `${new Date(value).toLocaleString()} – ${new Date(bid.windowEnd).toLocaleString()}` },
    { key: 'status', label: 'Status', render: value => <span className="capitalize">{value}</span> },
    { key: 'createdAt', label: 'Placed', render: value => new Date(value).toLocaleDateString() }
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="bid"
        eyebrow="BUYER ACTIVITY"
        title="My bids"
        description="Keep track of the clean-energy offers you have bid on and their delivery status."
      />
      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">BUYER ACTIVITY</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">My bids</h2></div>
        <label className="text-xs font-semibold text-ink">Status
          <select value={status} onChange={event => setStatus(event.target.value)} className="form-input mt-1 min-w-40">
            <option value="">All bids</option>
            {['open', 'matched', 'cancelled'].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadBids(pagination.page)} /></div>}
      <DataTable columns={columns} data={bids} loading={loading} pagination={pagination} onPageChange={loadBids} emptyMessage="No bids yet. Browse the marketplace to place your first bid." />
      </section>
    </div>
  );
}
