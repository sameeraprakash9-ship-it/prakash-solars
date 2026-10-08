import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../context/ToastContext';

const localDateTime = date => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const today = new Date();
const nextDay = new Date(today);
nextDay.setDate(nextDay.getDate() + 1);
const initialForm = {
  meter: '',
  quantityKwh: '',
  askPricePerKwh: '',
  windowStart: localDateTime(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
  windowEnd: localDateTime(new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()))
};

export default function Listings() {
  const [meters, setMeters] = useState([]);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [surplus, setSurplus] = useState(null);
  const [surplusError, setSurplusError] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meterResponse, listingResponse] = await Promise.all([
        api.get('/meters'),
        api.get('/listings/mine')
      ]);
      setMeters(meterResponse.data);
      setListings(listingResponse.data);
      setError('');
      setForm(current => ({ ...current, meter: current.meter || meterResponse.data[0]?._id || '' }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load listing information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedWindow = useMemo(() => {
    if (!form.meter || !form.windowStart || !form.windowEnd) return null;
    const from = new Date(form.windowStart);
    const to = new Date(form.windowEnd);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return null;
    return { from: from.toISOString(), to: to.toISOString() };
  }, [form.meter, form.windowStart, form.windowEnd]);

  useEffect(() => {
    if (!selectedWindow) {
      setSurplus(null);
      setSurplusError('');
      return undefined;
    }
    let active = true;
    api.get(`/meters/${form.meter}/surplus`, { params: selectedWindow })
      .then(({ data }) => {
        if (active) {
          setSurplus(data);
          setSurplusError('');
        }
      })
      .catch(requestError => {
        if (active) {
          setSurplus(null);
          setSurplusError(requestError.response?.data?.message || 'Unable to calculate sellable energy.');
        }
      });
    return () => { active = false; };
  }, [form.meter, selectedWindow]);

  const createListing = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/listings', {
        meter: form.meter,
        quantityKwh: Number(form.quantityKwh),
        askPricePerKwh: Number(form.askPricePerKwh),
        windowStart: new Date(form.windowStart).toISOString(),
        windowEnd: new Date(form.windowEnd).toISOString()
      });
      setForm(current => ({ ...initialForm, meter: current.meter }));
      toast('Energy listing created.');
      await loadData();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to create listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveListing = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/listings/${editing._id}`, {
        quantityKwh: Number(editing.quantityKwh),
        askPricePerKwh: Number(editing.askPricePerKwh)
      });
      setEditing(null);
      toast('Listing updated.');
      await loadData();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to update listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelListing = async listing => {
    if (!window.confirm('Cancel this listing?')) return;
    try {
      await api.delete(`/listings/${listing._id}`);
      toast('Listing cancelled.');
      await loadData();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to cancel listing.', 'error');
    }
  };

  const columns = [
    { key: 'quantityKwh', label: 'Quantity', render: (value, listing) => `${value} kWh (${listing.remainingKwh} remaining)` },
    { key: 'askPricePerKwh', label: 'Price', render: value => `$${Number(value).toFixed(3)} / kWh` },
    { key: 'windowStart', label: 'Delivery window', render: (value, listing) => `${new Date(value).toLocaleString()} – ${new Date(listing.windowEnd).toLocaleString()}` },
    { key: 'status', label: 'Status', render: value => <span className="capitalize">{value}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, listing) => listing.status === 'open' ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing({ ...listing })} className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-bold text-leaf">Edit</button>
          <button type="button" onClick={() => cancelListing(listing)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">Cancel</button>
        </div>
      ) : '—'
    }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">SELL LOCAL ENERGY</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Create a listing</h2>
        <form onSubmit={createListing} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-ink">
            Generation meter
            <select required value={form.meter} onChange={event => setForm({ ...form, meter: event.target.value })} className="form-input mt-2">
              <option value="">Choose a meter</option>
              {meters.filter(meter => meter.type !== 'consumption').map(meter => <option key={meter._id} value={meter._id}>{meter.serialNo} · {meter.zone}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink">
            Quantity (kWh)
            <input required min="0.001" step="0.001" type="number" value={form.quantityKwh} onChange={event => setForm({ ...form, quantityKwh: event.target.value })} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">
            Asking price ($/kWh)
            <input required min="0" step="0.001" type="number" value={form.askPricePerKwh} onChange={event => setForm({ ...form, askPricePerKwh: event.target.value })} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">
            Delivery starts
            <input required type="datetime-local" value={form.windowStart} onChange={event => setForm({ ...form, windowStart: event.target.value })} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">
            Delivery ends
            <input required type="datetime-local" value={form.windowEnd} onChange={event => setForm({ ...form, windowEnd: event.target.value })} className="form-input mt-2" />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <p className="text-xs text-muted">Sellable in this window: <strong className="text-ink">{surplus ? `${surplus.sellableKwh} kWh` : '—'}</strong></p>
            {surplusError && <p role="alert" className="text-xs text-red-700">{surplusError}</p>}
            <button disabled={saving || !meters.some(meter => meter.type !== 'consumption')} className="rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-50">
              {saving ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <h2 className="mb-5 font-display text-xl font-semibold text-ink">My listings</h2>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={loadData} /></div>}
        <DataTable columns={columns} data={listings} loading={loading} emptyMessage="You have not posted any energy listings." />
      </section>

      {editing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/50 p-4">
          <form onSubmit={saveListing} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold text-ink">Edit listing</h2>
            <label className="mt-5 block text-xs font-semibold text-ink">Total quantity (kWh)
              <input required min={editing.quantityKwh - editing.remainingKwh} step="0.001" type="number" value={editing.quantityKwh} onChange={event => setEditing({ ...editing, quantityKwh: event.target.value })} className="form-input mt-2" />
            </label>
            <label className="mt-4 block text-xs font-semibold text-ink">Price ($/kWh)
              <input required min="0" step="0.001" type="number" value={editing.askPricePerKwh} onChange={event => setEditing({ ...editing, askPricePerKwh: event.target.value })} className="form-input mt-2" />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-bold">Close</button>
              <button disabled={saving} className="rounded-xl bg-leaf px-4 py-2 text-sm font-bold text-white">Save changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
