import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import WorkspaceHero from '../components/WorkspaceHero';
import { useToast } from '../context/ToastContext';

const pageSize = 10;

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [totalCo2, setTotalCo2] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const toast = useToast();

  const loadCertificates = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/carbon/certificates', { params: { page, limit: pageSize } });
      setCertificates(data.data);
      setPagination(data.pagination);
      setTotalCo2(data.totalCo2AvoidedKg || 0);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettledTransactions = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions', { params: { page: 1, limit: 100, status: 'settled' } });
      setTransactions(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load eligible transactions.');
    }
  }, []);

  useEffect(() => {
    loadCertificates(1);
    loadSettledTransactions();
  }, [loadCertificates, loadSettledTransactions]);

  const issuedTransactionIds = new Set(certificates.map(certificate =>
    typeof certificate.transaction === 'string' ? certificate.transaction : certificate.transaction?._id
  ));
  const eligibleTransactions = transactions.filter(transaction => !issuedTransactionIds.has(transaction._id));

  const issueCertificate = async transaction => {
    setSavingId(transaction._id);
    try {
      await api.post('/carbon/certificates', { transaction: transaction._id });
      toast('Carbon certificate issued.');
      await Promise.all([loadCertificates(pagination.page), loadSettledTransactions()]);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to issue certificate.', 'error');
      await loadCertificates(pagination.page);
    } finally {
      setSavingId('');
    }
  };

  const download = async certificate => {
    try {
      const { data } = await api.get(`/carbon/certificates/${certificate._id}/download`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${certificate.certNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to download certificate PDF.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="certificate"
        eyebrow="VERIFIED CLEAN-ENERGY IMPACT"
        title="Carbon certificates"
        description="Issue, download, and publicly verify a certificate for each settled energy trade."
      >
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/65">CO₂ avoided</p>
          <p className="font-display text-xl font-bold text-lime">{Number(totalCo2).toFixed(2)} kg</p>
        </div>
      </WorkspaceHero>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <h2 className="mb-4 font-display text-xl font-semibold text-ink">Issue a certificate</h2>
        <p className="mb-4 text-sm text-muted">A certificate can be issued once for each settled transaction.</p>
        {eligibleTransactions.length ? (
          <div className="divide-y divide-ink/5">
            {eligibleTransactions.map(transaction => (
              <div key={transaction._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-bold text-ink">Transaction {transaction._id.slice(-8)}</p><p className="mt-1 text-xs text-muted">{transaction.deliveredKwh} kWh delivered · {new Date(transaction.createdAt).toLocaleDateString()}</p></div>
                <button type="button" disabled={savingId === transaction._id} onClick={() => issueCertificate(transaction)} className="rounded-xl bg-leaf px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savingId === transaction._id ? 'Issuing…' : 'Issue certificate'}</button>
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">No unsettled-to-certificate trades are available.</p>}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-ink">My certificates</h2>
          <p className="mt-1 text-sm text-muted">Your issued clean-energy certificates, ready to download or verify.</p>
        </div>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => { loadCertificates(pagination.page); loadSettledTransactions(); }} /></div>}
        {loading ? <Loader compact label="Loading certificates…" /> : certificates.length === 0 ? (
          <div className="grid gap-5 rounded-2xl bg-canvas p-4 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="text-center lg:text-left">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl text-leaf shadow-card lg:mx-0" aria-hidden="true">✳</span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Your certificates will appear here</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Issue a certificate for a settled trade above. Then download the PDF or share its public verification link.</p>
            </div>
            <article aria-label="Certificate preview, not issued" className="relative overflow-hidden rounded-xl border border-leaf/20 bg-white p-5 shadow-sm sm:p-6">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border-[14px] border-lime/15" />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-leaf">SUNWISE · CLEAN ENERGY</p>
                  <h4 className="mt-2 font-display text-lg font-bold text-ink">Carbon impact certificate</h4>
                </div>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-muted">Preview · not issued</span>
              </div>
              <p className="relative mt-4 border-b border-ink/10 pb-3 font-mono text-xs font-bold text-muted">Certificate number appears after issue</p>
              <div className="relative mt-4 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Clean energy</p><p className="mt-1 font-display text-lg font-bold text-ink">— <span className="text-xs">kWh</span></p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">CO₂ avoided</p><p className="mt-1 font-display text-lg font-bold text-leaf">— <span className="text-xs">kg</span></p></div>
              </div>
            </article>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {certificates.map(certificate => (
              <article key={certificate._id} className="rounded-2xl border border-[#e3dfd4] bg-[#fcfbf8] p-3">
                <div className="relative overflow-hidden rounded-xl border border-leaf/20 bg-white p-5 sm:p-6">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-lime/15" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-leaf">SUNWISE · CLEAN ENERGY</p>
                      <h3 className="mt-2 font-display text-xl font-bold text-ink">Impact certificate</h3>
                      <p className="mt-1 text-xs text-muted">Verified record of a settled community energy trade</p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-lime bg-lime/20 text-xl text-leaf" aria-label="Verified certificate">✓</span>
                  </div>
                  <p className="relative mt-5 break-all font-mono text-xs font-bold tracking-wide text-leaf">{certificate.certNo}</p>
                  <div className="relative mt-4 grid grid-cols-2 gap-3 border-y border-ink/10 py-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Clean energy</p>
                      <p className="mt-1 font-display text-lg font-bold text-ink">{Number(certificate.kwh).toFixed(2)} <span className="text-xs font-semibold">kWh</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">CO₂ avoided</p>
                      <p className="mt-1 font-display text-lg font-bold text-leaf">{Number(certificate.co2AvoidedKg).toFixed(2)} <span className="text-xs font-semibold">kg</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Issued</p>
                      <p className="mt-1 text-xs font-semibold text-ink">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Trade reference</p>
                      <p className="mt-1 text-xs font-semibold text-ink">{typeof certificate.transaction === 'string' ? certificate.transaction.slice(-8) : certificate.transaction?._id?.slice(-8) || 'Verified trade'}</p>
                    </div>
                  </div>
                  <div className="relative mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => download(certificate)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold text-leaf hover:border-leaf">Download PDF</button>
                    <Link to={`/verify/${encodeURIComponent(certificate.certNo)}`} className="rounded-lg bg-leaf px-3 py-2 text-xs font-bold text-white hover:bg-ink">Verify certificate</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && pagination.pages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-ink/5 pt-4">
            <p className="text-xs text-muted">{pagination.total} certificates · Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={pagination.page <= 1} onClick={() => loadCertificates(pagination.page - 1)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
              <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => loadCertificates(pagination.page + 1)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
