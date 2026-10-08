import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../context/ToastContext';

const defaults = { zones: [], platformFeePercent: 2, emissionFactor: 0.82 };
const newZone = { zone: '', capacityKw: 0, tradingStartHour: 6, tradingEndHour: 20 };

export default function GridConfig() {
  const toast = useToast();
  const [config, setConfig] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/grid/config');
      setConfig({
        zones: data.zones || [],
        platformFeePercent: data.platformFeePercent,
        emissionFactor: data.emissionFactor
      });
      setError('');
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setConfig(defaults);
        setError('');
      } else {
        setError(requestError.response?.data?.message || 'Unable to load grid configuration.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const setConfigValue = (field, value) => setConfig(current => ({ ...current, [field]: value }));
  const setZoneValue = (index, field, value) => setConfig(current => ({
    ...current,
    zones: current.zones.map((zone, zoneIndex) => zoneIndex === index
      ? { ...zone, [field]: field === 'zone' ? value : Number(value) }
      : zone)
  }));

  const saveConfig = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        zones: config.zones.map(zone => ({
          ...zone,
          capacityKw: Number(zone.capacityKw),
          tradingStartHour: Number(zone.tradingStartHour),
          tradingEndHour: Number(zone.tradingEndHour)
        })),
        platformFeePercent: Number(config.platformFeePercent),
        emissionFactor: Number(config.emissionFactor)
      };
      const { data } = await api.put('/admin/grid/config', payload);
      setConfig({ zones: data.zones, platformFeePercent: data.platformFeePercent, emissionFactor: data.emissionFactor });
      toast('Grid configuration saved.');
      setError('');
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to save grid configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={saveConfig} className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">GRID PARAMETERS</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Grid configuration</h2>
        <p className="mt-2 text-sm text-muted">Zone capacities and trading hours also drive platform grid alerts.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-ink">Platform fee (%)
            <input required min="0" max="100" step="0.01" type="number" value={config.platformFeePercent} onChange={event => setConfigValue('platformFeePercent', event.target.value)} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">Emission factor (kg CO₂/kWh)
            <input required min="0" step="0.001" type="number" value={config.emissionFactor} onChange={event => setConfigValue('emissionFactor', event.target.value)} className="form-input mt-2" />
          </label>
        </div>
      </section>

      {error && <ErrorMessage message={error} onRetry={loadConfig} />}

      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-display text-xl font-semibold text-ink">Trading zones</h3><p className="mt-1 text-xs text-muted">Trading hours are UTC.</p></div>
          <button type="button" onClick={() => setConfig(current => ({ ...current, zones: [...current.zones, { ...newZone }] }))} className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-leaf hover:border-leaf">Add zone</button>
        </div>
        {config.zones.length === 0 && <p className="mb-4 rounded-2xl bg-canvas p-5 text-sm text-muted">No zones configured. Add a zone to set capacity and trading hours.</p>}
        <div className="space-y-4">
          {config.zones.map((zone, index) => (
            <article key={`${zone.zone}-${index}`} className="grid gap-3 rounded-2xl border border-ink/5 bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-semibold text-ink">Zone name<input required value={zone.zone} onChange={event => setZoneValue(index, 'zone', event.target.value)} className="form-input mt-1 bg-white" /></label>
              <label className="text-xs font-semibold text-ink">Capacity (kW)<input required min="0" step="0.1" type="number" value={zone.capacityKw} onChange={event => setZoneValue(index, 'capacityKw', event.target.value)} className="form-input mt-1 bg-white" /></label>
              <label className="text-xs font-semibold text-ink">Trading starts (UTC)<input required min="0" max="23" step="1" type="number" value={zone.tradingStartHour} onChange={event => setZoneValue(index, 'tradingStartHour', event.target.value)} className="form-input mt-1 bg-white" /></label>
              <label className="text-xs font-semibold text-ink">Trading ends (UTC)<input required min="0" max="23" step="1" type="number" value={zone.tradingEndHour} onChange={event => setZoneValue(index, 'tradingEndHour', event.target.value)} className="form-input mt-1 bg-white" /></label>
              <button type="button" onClick={() => setConfig(current => ({ ...current, zones: current.zones.filter((_, zoneIndex) => zoneIndex !== index) }))} className="self-end rounded-xl border border-red-200 px-3 py-3 text-xs font-bold text-red-700">Remove zone</button>
            </article>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button disabled={saving || loading} className="rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-50">{saving ? 'Saving…' : 'Save grid configuration'}</button>
        </div>
      </section>
    </form>
  );
}
