import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import WorkspaceHero from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Wallet() {
  const { user } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/wallet');
      setWallet(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const topUp = async event => {
    event.preventDefault();
    setTopUpLoading(true);
    try {
      const { data } = await api.post('/wallet/topup', { amount: Number(topUpAmount) });
      setTopUpAmount('');
      toast(`Wallet topped up. New balance: $${Number(data.balance).toFixed(2)}.`);
      await loadWallet();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to top up wallet.', 'error');
    } finally {
      setTopUpLoading(false);
    }
  };

  const entryColumns = [
    { key: 'createdAt', label: 'Date', render: value => new Date(value).toLocaleString() },
    { key: 'type', label: 'Entry', render: value => <span className="capitalize">{value}</span> },
    { key: 'amount', label: 'Amount', render: value => `$${Number(value).toFixed(2)}` },
    { key: 'balanceAfter', label: 'Balance after', render: value => `$${Number(value).toFixed(2)}` }
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="wallet"
        eyebrow="YOUR ACCOUNT"
        title="Wallet"
        description="Your balance and account activity for local energy trading."
      />
      <section className="rounded-3xl bg-ink p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">YOUR ACCOUNT</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Wallet</h2>
            <p className="mt-6 text-sm text-white/60">Available balance</p>
            <p className="mt-1 font-display text-4xl font-bold">${Number(wallet?.balance || 0).toFixed(2)}</p>
          </div>
          {user.role === 'consumer' && (
            <form onSubmit={topUp} className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-white/75">Simulated top-up ($)
                <input required min="1" max="100000" step="0.01" type="number" value={topUpAmount} onChange={event => setTopUpAmount(event.target.value)} className="form-input mt-1 min-w-40 bg-white text-ink" />
              </label>
              <button disabled={topUpLoading} className="rounded-xl bg-lime px-4 py-3 text-xs font-bold text-ink disabled:opacity-50">{topUpLoading ? 'Adding…' : 'Add funds'}</button>
            </form>
          )}
        </div>
      </section>

      {error && <ErrorMessage message={error} onRetry={loadWallet} />}
      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <h2 className="mb-5 font-display text-xl font-semibold text-ink">Wallet activity</h2>
        <DataTable columns={entryColumns} data={wallet?.entries || []} loading={loading} emptyMessage="No wallet entries yet." />
      </section>
    </div>
  );
}
