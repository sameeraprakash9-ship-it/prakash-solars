import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import WorkspaceHero from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const pageSize = 10;

export default function Disputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState('reject');
  const [refundAmount, setRefundAmount] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadDisputes = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/disputes', {
        params: { page, limit: pageSize, ...(status ? { status } : {}) }
      });
      setDisputes(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load disputes.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions', { params: { page: 1, limit: 100, status: 'settled' } });
      setTransactions(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load eligible transactions.');
    }
  }, []);

  useEffect(() => {
    loadDisputes(1);
    if (user.role !== 'admin') loadTransactions();
  }, [loadDisputes, loadTransactions, user.role]);

  const raiseDispute = async event => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await api.post('/disputes', {
        transaction: form.get('transaction'),
        reason: reason.trim(),
        evidence: evidence.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
      });
      setReason('');
      setEvidence('');
      formElement.reset();
      toast('Dispute submitted.');
      await Promise.all([loadDisputes(1), loadTransactions()]);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to raise dispute.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDispute = async dispute => {
    try {
      const { data } = await api.get(`/disputes/${dispute._id}`);
      setSelected(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load dispute details.');
    }
  };

  const addComment = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/disputes/${selected._id}/comments`, { text: comment.trim() });
      setSelected(data);
      setComment('');
      toast('Comment added.');
      await loadDisputes(pagination.page);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to add comment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resolveDispute = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        decision,
        note: resolutionNote.trim(),
        ...(decision === 'partial_refund' ? { amount: Number(refundAmount) } : {})
      };
      await api.patch(`/disputes/${selected._id}/resolve`, payload);
      const { data } = await api.get(`/disputes/${selected._id}`);
      setSelected(data);
      setResolutionNote('');
      setRefundAmount('');
      toast('Dispute resolution recorded.');
      await loadDisputes(pagination.page);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to resolve dispute.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'transaction', label: 'Transaction', render: value => value?._id?.slice(-8) || '—' },
    { key: 'reason', label: 'Reason', render: value => <span className="line-clamp-2">{value}</span> },
    { key: 'status', label: 'Status', render: value => <span className="capitalize">{value.replace('_', ' ')}</span> },
    { key: 'createdAt', label: 'Raised', render: value => new Date(value).toLocaleDateString() },
    { key: 'actions', label: 'Details', render: (_, dispute) => <button type="button" onClick={() => openDispute(dispute)} className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-bold text-leaf">View thread</button> }
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="dispute"
        eyebrow="TRADE SUPPORT"
        title="Disputes"
        description="Get help with a settled trade and keep track of comments and resolutions."
      />
      {user.role !== 'admin' && <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">HELP RESOLVE A TRADE</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Raise a dispute</h2>
        <p className="mt-2 text-sm text-muted">Only settled transactions can be disputed. Add evidence links or references on separate lines.</p>
        <form onSubmit={raiseDispute} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-ink md:col-span-2">Settled transaction
            <select required name="transaction" className="form-input mt-2">
              <option value="">Choose a transaction</option>
              {transactions.map(transaction => <option key={transaction._id} value={transaction._id}>{transaction._id.slice(-8)} · {transaction.deliveredKwh} kWh · ${Number(transaction.amount).toFixed(2)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink">Reason
            <textarea required rows="3" value={reason} onChange={event => setReason(event.target.value)} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">Evidence (optional, one per line)
            <textarea rows="3" value={evidence} onChange={event => setEvidence(event.target.value)} className="form-input mt-2" placeholder="URLs or reference notes" />
          </label>
          <button disabled={saving || transactions.length === 0} className="rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-50 md:col-span-2 md:justify-self-end">
            {saving ? 'Submitting…' : 'Submit dispute'}
          </button>
        </form>
      </section>}

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Dispute history</h2>
          <label className="text-xs font-semibold text-ink">Status
            <select value={status} onChange={event => setStatus(event.target.value)} className="form-input mt-1 min-w-40">
              <option value="">All statuses</option>
              {['open', 'under_review', 'resolved', 'rejected'].map(value => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadDisputes(pagination.page)} /></div>}
        <DataTable columns={columns} data={disputes} loading={loading} pagination={pagination} onPageChange={loadDisputes} emptyMessage="No disputes found." />
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/50 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf">DISPUTE · {selected._id.slice(-8)}</p><h2 className="mt-1 font-display text-xl font-bold capitalize text-ink">{selected.status.replace('_', ' ')}</h2></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close dispute" className="rounded-lg border border-ink/10 px-3 py-1 text-lg">×</button>
            </div>
            <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm">
              <p><strong>Reason:</strong> {selected.reason}</p>
              <p className="mt-2"><strong>Transaction:</strong> {selected.transaction?._id}</p>
              {selected.evidence?.length > 0 && <div className="mt-2"><strong>Evidence:</strong><ul className="list-inside list-disc">{selected.evidence.map(item => <li key={item}>{item}</li>)}</ul></div>}
              {selected.resolution && <p className="mt-2"><strong>Resolution:</strong> {selected.resolution}</p>}
            </div>
            <h3 className="mt-6 font-bold text-ink">Comment thread</h3>
            <div className="mt-3 space-y-3">
              {selected.comments?.length ? selected.comments.map((item, index) => (
                <article key={item._id || index} className="rounded-2xl border border-ink/5 p-3">
                  <p className="text-xs font-bold text-ink">{item.user?.name || 'Participant'} <span className="ml-2 font-normal text-muted">{new Date(item.createdAt).toLocaleString()}</span></p>
                  <p className="mt-1 text-sm text-muted">{item.text}</p>
                </article>
              )) : <p className="text-sm text-muted">No comments yet.</p>}
            </div>
            {['open', 'under_review'].includes(selected.status) && (
              <>
                <form onSubmit={addComment} className="mt-5">
                  <label className="text-xs font-semibold text-ink">Add a comment
                    <textarea required rows="2" value={comment} onChange={event => setComment(event.target.value)} className="form-input mt-2" />
                  </label>
                  <button disabled={saving} className="mt-3 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Sending…' : 'Send comment'}</button>
                </form>
                {user.role === 'admin' && (
                  <form onSubmit={resolveDispute} className="mt-6 rounded-2xl border border-ink/5 bg-canvas p-4">
                    <h3 className="font-bold text-ink">Administrator resolution</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-ink">Decision
                        <select value={decision} onChange={event => setDecision(event.target.value)} className="form-input mt-1">
                          <option value="reject">Reject dispute</option>
                          <option value="full_refund">Full refund</option>
                          <option value="partial_refund">Partial refund</option>
                        </select>
                      </label>
                      {decision === 'partial_refund' && <label className="text-xs font-semibold text-ink">Refund amount
                        <input required min="0.01" step="0.01" type="number" value={refundAmount} onChange={event => setRefundAmount(event.target.value)} className="form-input mt-1" />
                      </label>}
                      <label className="text-xs font-semibold text-ink sm:col-span-2">Resolution note
                        <textarea required rows="2" value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} className="form-input mt-1" />
                      </label>
                    </div>
                    <button disabled={saving} className="mt-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Resolving…' : 'Resolve dispute'}</button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
