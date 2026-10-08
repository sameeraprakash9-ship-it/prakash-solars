import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import DashboardHero from '../components/DashboardHero';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

const dayBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};

export default function ProsumerDashboard() {
  const { user } = useAuth();
  const [meters, setMeters] = useState([]);
  const [readings, setReadings] = useState([]);
  const [sellableKwh, setSellableKwh] = useState(0);
  const [totals, setTotals] = useState({ generated: 0, consumed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bounds = dayBounds();

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data: meterData } = await api.get('/meters');
      setMeters(meterData);
      if (meterData.length === 0) {
        setReadings([]);
        setTotals({ generated: 0, consumed: 0 });
        setSellableKwh(0);
        setError('');
        return;
      }

      const results = await Promise.all(meterData.map(async meter => {
        const [readingResponse, surplusResponse] = await Promise.all([
          api.get(`/meters/${meter._id}/readings`, { params: { ...bounds, interval: 'hour' } }),
          api.get(`/meters/${meter._id}/surplus`, { params: bounds })
        ]);
        return { readings: readingResponse.data, surplus: surplusResponse.data };
      }));
      const byHour = new Map();
      let generated = 0;
      let consumed = 0;
      let available = 0;
      results.forEach(result => {
        available += result.surplus.sellableKwh || 0;
        result.readings.forEach(reading => {
          const value = byHour.get(reading.period) || { generatedKwh: 0, consumedKwh: 0 };
          value.generatedKwh += reading.generatedKwh;
          value.consumedKwh += reading.consumedKwh;
          byHour.set(reading.period, value);
          generated += reading.generatedKwh;
          consumed += reading.consumedKwh;
        });
      });
      const hourly = Array.from({ length: 24 }, (_, hour) => {
        const point = new Date(bounds.from);
        point.setHours(hour);
        const period = point.toISOString().slice(0, 13) + ':00';
        const values = byHour.get(period) || { generatedKwh: 0, consumedKwh: 0 };
        return {
          hour: point.toLocaleTimeString([], { hour: 'numeric' }),
          generation: Number(values.generatedKwh.toFixed(3)),
          consumption: Number(values.consumedKwh.toFixed(3))
        };
      });
      setReadings(hourly);
      setTotals({ generated, consumed });
      setSellableKwh(available);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load generation and consumption data.');
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="PROSUMER OVERVIEW"
        title={`Good morning, ${user.name.split(' ')[0]}.`}
        description="Today’s solar generation, household use, and energy ready to sell."
      >
        <Link to="/workspace/meters" className="rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20">My meters</Link>
        <Link to="/workspace/listings" className="rounded-xl bg-lime px-4 py-2.5 text-xs font-bold text-ink hover:bg-white">Create listing</Link>
      </DashboardHero>

      {error && <ErrorMessage message={error} onRetry={loadOverview} />}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Generated today', value: totals.generated, unit: 'kWh', tone: 'bg-ink text-white' },
          { label: 'Consumed today', value: totals.consumed, unit: 'kWh', tone: 'bg-white text-ink' },
          { label: 'Sellable surplus', value: sellableKwh, unit: 'kWh', tone: 'bg-lime text-ink' }
        ].map(card => (
          <article key={card.label} className={`rounded-3xl p-6 shadow-card ${card.tone}`}>
            <p className="text-sm opacity-65">{card.label}</p>
            <p className="mt-6 font-display text-4xl font-semibold">{loading ? '—' : Number(card.value).toFixed(2)}<span className="ml-2 text-base font-medium opacity-65">{card.unit}</span></p>
            <p className="mt-2 text-xs opacity-55">Across {meters.length} registered {meters.length === 1 ? 'meter' : 'meters'}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Hourly generation vs. consumption</h2>
            <p className="mt-1 text-xs text-muted">Combined readings from your meters today</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <span className="text-leaf">● Generation</span>
            <span className="text-ink">● Consumption</span>
          </div>
        </div>
        <div className="mt-7 h-72">
          {loading ? <Loader compact label="Loading meter readings…" /> : meters.length === 0 ? (
            <div className="grid h-full place-items-center rounded-2xl bg-canvas text-center">
              <div><p className="font-semibold text-ink">No meters connected yet</p><Link to="/workspace/meters" className="mt-2 inline-block text-sm font-bold text-leaf">Add a meter to get started →</Link></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readings} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="prosumerGeneration" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#17233b" stopOpacity={0.2} /><stop offset="100%" stopColor="#17233b" stopOpacity={0} /></linearGradient>
                  <linearGradient id="prosumerConsumption" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2c866" stopOpacity={0.35} /><stop offset="100%" stopColor="#f2c866" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8e4da" />
                <XAxis dataKey="hour" interval={2} tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e3dfd4', fontSize: 12 }} formatter={value => [`${value} kWh`]} />
                <Area type="monotone" dataKey="generation" name="Generation" stroke="#17233b" strokeWidth={2.5} fill="url(#prosumerGeneration)" />
                <Area type="monotone" dataKey="consumption" name="Consumption" stroke="#b17b18" strokeWidth={2.5} fill="url(#prosumerConsumption)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
