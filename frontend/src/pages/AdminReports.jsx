import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';

const roleColors = ['#17233b', '#c08a26', '#8991a0'];

export default function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/reports');
      setReport(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load platform reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const roleData = report?.usersByRole
    ? Object.entries(report.usersByRole).map(([role, count]) => ({ role, count }))
    : [];
  const topProsumers = report?.topProsumersByKwhSold || [];
  const columns = [
    { key: 'name', label: 'Prosumer' },
    { key: 'email', label: 'Email' },
    { key: 'kwhSold', label: 'Energy sold', render: value => `${Number(value).toFixed(3)} kWh` }
  ];

  const stats = [
    ['Total energy traded', `${Number(report?.totalKwhTraded || 0).toFixed(2)} kWh`],
    ['Trading revenue', `$${Number(report?.totalRevenue || 0).toFixed(2)}`],
    ['Platform fee income', `$${Number(report?.platformFeeIncome || 0).toFixed(2)}`],
    ['Open disputes', report?.openDisputes ?? '—']
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">PLATFORM INSIGHTS</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Reports</h2>
        <p className="mt-2 text-sm text-muted">Aggregated platform activity and top prosumers by settled energy sales.</p>
      </section>
      {error && <ErrorMessage message={error} onRetry={loadReport} />}
      {loading && !report ? <Loader label="Loading platform reports…" /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value], index) => <article key={label} className={`rounded-3xl p-6 shadow-card ${index === 0 ? 'bg-ink text-white' : index === 1 ? 'bg-lime text-ink' : 'bg-white text-ink'}`}><p className="text-sm opacity-65">{label}</p><p className="mt-6 font-display text-3xl font-semibold">{value}</p></article>)}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
              <h3 className="font-display text-lg font-semibold text-ink">Users by role</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleData} dataKey="count" nameKey="role" innerRadius={65} outerRadius={100} paddingAngle={4} label={({ role, count }) => `${role}: ${count}`}>
                      {roleData.map((entry, index) => <Cell key={entry.role} fill={roleColors[index % roleColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
              <h3 className="font-display text-lg font-semibold text-ink">Top prosumers by kWh sold</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProsumers} margin={{ top: 8, right: 8, left: -12, bottom: 10 }}>
                    <CartesianGrid vertical={false} stroke="#e8e4da" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 10 }} />
                    <Tooltip formatter={value => [`${value} kWh`, 'Energy sold']} />
                    <Bar dataKey="kwhSold" name="kWh sold" fill="#17233b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
          <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
            <h3 className="mb-5 font-display text-lg font-semibold text-ink">Top sellers</h3>
            <DataTable columns={columns} data={topProsumers} emptyMessage="No settled prosumer sales yet." />
          </section>
        </>
      )}
    </div>
  );
}
