import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import DashboardHero from '../components/DashboardHero';
import Loader from '../components/Loader';

export default function ConsumerDashboard() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [priceResult, forecastResult, walletResult, summaryResult] = await Promise.allSettled([
        api.get('/pricing/current'),
        api.get('/pricing/forecast'),
        api.get('/wallet'),
        api.get('/ledger/summary')
      ]);
      const failures = [];
      if (priceResult.status === 'fulfilled') setCurrentPrice(priceResult.value.data);
      else failures.push(priceResult.reason.response?.data?.message || 'Current price is unavailable.');
      if (forecastResult.status === 'fulfilled') setForecast(forecastResult.value.data);
      else failures.push(forecastResult.reason.response?.data?.message || 'Price forecast is unavailable.');
      if (walletResult.status === 'fulfilled') setWallet(walletResult.value.data);
      else failures.push(walletResult.reason.response?.data?.message || 'Wallet balance is unavailable.');
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data);
      else failures.push(summaryResult.reason.response?.data?.message || 'Purchase summary is unavailable.');
      setError(failures.join(' '));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const chartData = forecast.map(item => ({
    hour: new Date(item.period).toLocaleTimeString([], { hour: 'numeric' }),
    price: item.price,
    supply: item.supply,
    demand: item.demand
  }));
  const lowestForecast = forecast.length
    ? forecast.reduce((lowest, item) => item.price < lowest.price ? item : lowest)
    : null;
  const highestForecast = forecast.length
    ? forecast.reduce((highest, item) => item.price > highest.price ? item : highest)
    : null;

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="CONSUMER OVERVIEW"
        title="Clean power, on your terms."
        description="Track local energy prices, forecast the next day, and plan your bids."
      >
        <Link to="/workspace/marketplace" className="rounded-xl bg-lime px-4 py-2.5 text-xs font-bold text-ink hover:bg-white">Browse marketplace</Link>
      </DashboardHero>

      {error && <ErrorMessage message={error} onRetry={loadDashboard} />}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-ink p-6 text-white shadow-card">
          <p className="text-sm text-white/60">Current energy price</p>
          <p className="mt-6 font-display text-4xl font-semibold">{loading ? '—' : `$${Number(currentPrice?.price || 0).toFixed(3)}`}<span className="ml-2 text-sm font-medium text-white/55">/ kWh</span></p>
          <p className="mt-2 text-xs text-white/50">{currentPrice?.createdAt ? `Updated ${new Date(currentPrice.createdAt).toLocaleTimeString()}` : 'Live platform price'}</p>
        </article>
        <article className="rounded-3xl bg-lime p-6 text-ink shadow-card">
          <p className="text-sm opacity-65">Wallet balance</p>
          <p className="mt-6 font-display text-4xl font-semibold">${loading ? '—' : Number(wallet?.balance || 0).toFixed(2)}</p>
          <Link to="/workspace/wallet" className="mt-2 inline-block text-xs font-bold underline decoration-ink/25 underline-offset-4">Manage wallet</Link>
        </article>
        <article className="rounded-3xl bg-white p-6 text-ink shadow-card">
          <p className="text-sm text-muted">Energy purchased</p>
          <p className="mt-6 font-display text-4xl font-semibold">{loading ? '—' : Number(summary?.totalKwhBought || 0).toFixed(2)}<span className="ml-2 text-base font-medium text-muted">kWh</span></p>
          <p className="mt-2 text-xs text-muted">Across settled trades</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <article className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-display text-xl font-semibold text-ink">Next 24-hour price forecast</h3><p className="mt-1 text-xs text-muted">Estimated from recorded meter readings and platform pricing rules—not live bids.</p></div>
            {currentPrice?.price !== undefined && <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-leaf">Now ${Number(currentPrice.price).toFixed(3)}/kWh</span>}
          </div>
          <div className="mt-7 h-72">
            {loading ? <Loader compact label="Loading price forecast…" /> : chartData.length === 0 ? (
              <div className="grid h-full place-items-center rounded-2xl bg-canvas text-sm text-muted">No forecast points are available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e8e4da" />
                  <XAxis dataKey="hour" interval={2} tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e3dfd4', fontSize: 12 }} formatter={(value, name) => [name === 'Price' ? `$${Number(value).toFixed(3)} / kWh` : `${value} kWh`, name]} />
                  <Line type="monotone" dataKey="price" name="Price" stroke="#17233b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
        <aside className="flex flex-col rounded-3xl bg-[#f0eadb] p-6 shadow-card sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">PLAN YOUR PURCHASE</p>
          <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink">Watch the market before you bid.</h3>
          <p className="mt-3 text-sm leading-6 text-muted">This is a price estimate from recorded meter readings and platform pricing rules, not an existing bid or guaranteed offer. Check it before you place a bid.</p>
          <div className="mt-7 space-y-3 rounded-2xl bg-white/70 p-4">
            <div className="flex justify-between gap-2 text-xs"><span className="text-muted">Forecast low</span><strong className="text-leaf">{lowestForecast ? `$${Number(lowestForecast.price).toFixed(3)}/kWh` : '—'}</strong></div>
            <div className="flex justify-between gap-2 text-xs"><span className="text-muted">Forecast high</span><strong className="text-ink">{highestForecast ? `$${Number(highestForecast.price).toFixed(3)}/kWh` : '—'}</strong></div>
          </div>
          <Link to="/workspace/marketplace" className="mt-auto rounded-xl bg-leaf px-4 py-3 text-center text-sm font-bold text-white hover:bg-ink">Explore available energy</Link>
        </aside>
      </section>
    </div>
  );
}
