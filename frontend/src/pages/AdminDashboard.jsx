import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import DashboardHero from '../components/DashboardHero';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import { useToast } from '../context/ToastContext';

function Metric({ title, value, note, dark = false }) {
  return (
    <article className={`rounded-3xl p-6 shadow-card ${dark ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
      <p className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>{title}</p>
      <p className="mt-5 font-display text-3xl font-semibold">{value}</p>
      <p className={`mt-2 text-xs ${dark ? 'text-white/45' : 'text-muted'}`}>{note}</p>
    </article>
  );
}

export default function AdminDashboard() {
  const toast = useToast();
  const [load, setLoad] = useState(null);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sourceRef = useRef(null);

  const loadGridDetails = useCallback(async () => {
    try {
      const [zonesResponse, alertsResponse] = await Promise.all([
        api.get('/grid/zones'),
        api.get('/grid/alerts')
      ]);
      setZones(zonesResponse.data);
      setAlerts(alertsResponse.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load grid zones and alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGridDetails();
    const refresh = window.setInterval(loadGridDetails, 30000);
    const token = localStorage.getItem('token');
    const baseUrl = api.defaults.baseURL.replace(/\/$/, '');
    const source = new EventSource(`${baseUrl}/grid/stream?token=${encodeURIComponent(token || '')}`);
    sourceRef.current = source;
    source.addEventListener('load', event => {
      try {
        setLoad(JSON.parse(event.data));
        setError('');
      } catch {
        setError('Received an invalid grid load update.');
      }
    });
    source.addEventListener('error', event => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          setError(data.message || 'Grid load stream reported an error.');
        } catch {
          setError('Grid load stream reported an error.');
        }
      }
    });
    source.onerror = () => setError(current => current || 'Live grid stream disconnected. It will retry automatically.');
    return () => {
      window.clearInterval(refresh);
      source.close();
      sourceRef.current = null;
    };
  }, [loadGridDetails]);

  const runMatching = async () => {
    setMatching(true);
    setMatchResult(null);
    try {
      const { data } = await api.post('/matching/run');
      setMatchResult(data);
      toast(`Matching complete: ${data.matchesCreated} match${data.matchesCreated === 1 ? '' : 'es'} created.`);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to run matching.', 'error');
    } finally {
      setMatching(false);
    }
  };

  const statusClass = load?.status === 'surplus'
    ? 'bg-lime text-ink'
    : load?.status === 'deficit'
      ? 'bg-red-100 text-red-700'
      : 'bg-canvas text-muted';

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="ADMIN CONTROL CENTER"
        title="Grid dashboard"
        description="Monitor live grid balance, zone activity, and system alerts."
      >
        <>
          <button type="button" disabled={matching} onClick={runMatching} className="rounded-xl bg-lime px-4 py-2.5 text-xs font-bold text-ink hover:bg-white disabled:opacity-50">
            {matching ? 'Matching…' : 'Run matching'}
          </button>
          <Link to="/workspace/transactions" className="rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20">Settle transactions</Link>
        </>
      </DashboardHero>

      {error && <ErrorMessage message={error} onRetry={loadGridDetails} />}
      {matchResult && (
        <div role="status" className="rounded-2xl border border-leaf/20 bg-lime/30 px-5 py-4 text-sm text-ink">
          Matching completed successfully. <strong>{matchResult.matchesCreated}</strong> match{matchResult.matchesCreated === 1 ? '' : 'es'} created.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Generation · last hour" value={load ? `${load.totalGenerationKwh} kWh` : '—'} note="Live EventSource feed" dark />
        <Metric title="Demand · last hour" value={load ? `${load.totalDemandKwh} kWh` : '—'} note="Across all meter readings" />
        <Metric title="Net grid balance" value={load ? `${load.netKwh} kWh` : '—'} note="Generation minus demand" />
        <article className="rounded-3xl bg-white p-6 shadow-card">
          <p className="text-sm text-muted">Grid status</p>
          <p className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass}`}>{load?.status || 'Connecting'}</p>
          <p className="mt-3 text-xs text-muted">Stream refreshes every five seconds</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div><h3 className="font-display text-xl font-semibold text-ink">Zone load</h3><p className="mt-1 text-xs text-muted">Generation and demand over the last hour</p></div>
            <Link to="/workspace/grid" className="text-xs font-bold text-leaf">Grid settings →</Link>
          </div>
          {loading ? <Loader compact /> : zones.length === 0 ? <p className="rounded-2xl bg-canvas p-8 text-center text-sm text-muted">No zone readings yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {zones.map(zone => (
                <article key={zone.zone} className={`rounded-2xl border p-4 ${zone.net < 0 ? 'border-red-200 bg-red-50' : 'border-ink/5 bg-canvas'}`}>
                  <div className="flex items-center justify-between gap-2"><h4 className="font-bold text-ink">{zone.zone}</h4><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${zone.net < 0 ? 'bg-red-100 text-red-700' : 'bg-lime/50 text-leaf'}`}>{zone.net < 0 ? 'Deficit' : 'Balanced/surplus'}</span></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted">Generation</p><p className="mt-1 font-bold text-ink">{zone.generation} kWh</p></div>
                    <div><p className="text-muted">Demand</p><p className="mt-1 font-bold text-ink">{zone.demand} kWh</p></div>
                    <div><p className="text-muted">Net</p><p className="mt-1 font-bold text-ink">{zone.net} kWh</p></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <div className="mb-5"><h3 className="font-display text-xl font-semibold text-ink">Grid alerts</h3><p className="mt-1 text-xs text-muted">Current capacity and supply signals</p></div>
          {loading ? <Loader compact /> : alerts.length === 0 ? (
            <div className="rounded-2xl bg-canvas p-8 text-center"><p className="text-sm font-semibold text-ink">No active alerts</p><p className="mt-1 text-xs text-muted">Grid conditions are within configured thresholds.</p></div>
          ) : (
            <div className="max-h-[27rem] space-y-3 overflow-y-auto">
              {alerts.map((alert, index) => (
                <article key={`${alert.zone}-${alert.type}-${index}`} className={`rounded-2xl border p-4 ${alert.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-ink">{alert.zone}</p><span className="text-[10px] font-bold uppercase text-muted">{alert.severity}</span></div>
                  <p className="mt-2 text-xs leading-5 text-ink">{alert.message}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
