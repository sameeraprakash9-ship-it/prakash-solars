import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';

export default function AdminMeters() {
  const [meters, setMeters] = useState([]);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMeters = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/meters');
      setMeters(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load meter reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeters(); }, [loadMeters]);

  const shownMeters = flaggedOnly ? meters.filter(meter => meter.flagged) : meters;
  const columns = [
    { key: 'serialNo', label: 'Serial number' },
    { key: 'owner', label: 'Owner', render: value => value?.name || value?.email || '—' },
    { key: 'type', label: 'Type', render: value => <span className="capitalize">{value}</span> },
    { key: 'capacityKw', label: 'Capacity', render: value => `${value} kW` },
    { key: 'zone', label: 'Zone' },
    { key: 'flagged', label: 'Flag', render: (value, meter) => value ? <div><span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700">Flagged</span><ul className="mt-2 list-inside list-disc space-y-1 text-[10px] leading-4 text-red-800">{(meter.flagReasons || []).map(reason => <li key={reason}>{reason}</li>)}</ul></div> : <span className="text-xs text-muted">Clear</span> }
  ];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">METER OVERSIGHT</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Meters</h2><p className="mt-1 text-xs text-muted">{meters.filter(meter => meter.flagged).length} flagged meter(s)</p></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink"><input type="checkbox" checked={flaggedOnly} onChange={event => setFlaggedOnly(event.target.checked)} className="accent-leaf" />Flagged only</label>
      </div>
      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={loadMeters} /></div>}
      <DataTable
        columns={columns}
        data={shownMeters}
        loading={loading}
        emptyMessage={flaggedOnly ? 'No flagged meters.' : 'No meters found.'}
        rowClassName={meter => meter.flagged ? 'bg-red-50' : ''}
      />
    </section>
  );
}
