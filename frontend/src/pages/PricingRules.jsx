import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../context/ToastContext';

const defaults = {
  basePrice: 0.2,
  floor: 0.05,
  ceiling: 1,
  peakHours: [],
  peakMultiplier: 1.25,
  sensitivityK: 0.2
};

export default function PricingRules() {
  const toast = useToast();
  const [form, setForm] = useState(defaults);
  const [peakHoursText, setPeakHoursText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRule = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pricing/rules');
      setForm(data);
      setPeakHoursText((data.peakHours || []).join(', '));
      setError('');
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setForm(defaults);
        setPeakHoursText('');
        setError('');
      } else {
        setError(requestError.response?.data?.message || 'Unable to load pricing rules.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRule(); }, [loadRule]);

  const saveRule = async event => {
    event.preventDefault();
    const peakHours = peakHoursText.trim()
      ? peakHoursText.split(',').map(hour => Number(hour.trim()))
      : [];
    setSaving(true);
    try {
      const payload = {
        basePrice: Number(form.basePrice),
        floor: Number(form.floor),
        ceiling: Number(form.ceiling),
        peakHours,
        peakMultiplier: Number(form.peakMultiplier),
        sensitivityK: Number(form.sensitivityK)
      };
      const { data } = await api.put('/pricing/rules', payload);
      setForm(data);
      setPeakHoursText(data.peakHours.join(', '));
      toast('Pricing rules saved.');
      setError('');
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to save pricing rules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recalculate = async () => {
    try {
      const { data } = await api.post('/pricing/recalculate');
      toast(`Current price recalculated: $${Number(data.price).toFixed(3)} / kWh.`);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to recalculate price.', 'error');
    }
  };

  const setNumber = name => event => setForm(current => ({ ...current, [name]: event.target.value }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">MARKET CONTROLS</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Pricing rules</h2><p className="mt-2 text-sm text-muted">Configure the price bounds, supply/demand sensitivity, and peak-hour multiplier.</p></div>
          <button type="button" onClick={recalculate} className="rounded-xl border border-ink/10 px-4 py-2.5 text-xs font-bold text-leaf hover:border-leaf">Recalculate current price</button>
        </div>
      </section>
      {error && <ErrorMessage message={error} onRetry={loadRule} />}
      <form onSubmit={saveRule} className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['basePrice', 'Base price ($/kWh)', '0.001'],
            ['floor', 'Price floor ($/kWh)', '0.001'],
            ['ceiling', 'Price ceiling ($/kWh)', '0.001'],
            ['peakMultiplier', 'Peak multiplier', '0.01'],
            ['sensitivityK', 'Supply/demand sensitivity', '0.01']
          ].map(([name, label, step]) => (
            <label key={name} className="text-xs font-semibold text-ink">{label}
              <input required min="0.001" step={step} type="number" value={form[name]} onChange={setNumber(name)} className="form-input mt-2" />
            </label>
          ))}
          <label className="text-xs font-semibold text-ink">Peak UTC hours (comma-separated)
            <input value={peakHoursText} onChange={event => setPeakHoursText(event.target.value)} className="form-input mt-2" placeholder="7, 8, 17, 18" />
            <span className="mt-1 block font-normal text-muted">Use unique whole hours from 0 through 23.</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button disabled={saving || loading} className="rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-50">{saving ? 'Saving…' : 'Save pricing rules'}</button>
        </div>
      </form>
    </div>
  );
}
