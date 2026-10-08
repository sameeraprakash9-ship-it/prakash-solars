import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from '../components/BrandLogo';
import Loader from '../components/Loader';

export default function VerifyCertificate() {
  const { certNo: routeCertNo } = useParams();
  const navigate = useNavigate();
  const [certNo, setCertNo] = useState(routeCertNo || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCertNo(routeCertNo || '');
    setResult(null);
    setError('');
    if (!routeCertNo) return undefined;

    let active = true;
    setLoading(true);
    api.get(`/carbon/verify/${encodeURIComponent(routeCertNo.trim())}`)
      .then(({ data }) => { if (active) setResult(data); })
      .catch(requestError => {
        if (!active) return;
        if (requestError.response?.status === 404) {
          setError('No certificate was found with that number. Check the certificate number and try again.');
        } else if (!requestError.response) {
          setError(`The verification API is unreachable (${api.defaults.baseURL}). Start the backend and check that VITE_API_URL points to its /api URL.`);
        } else {
          setError(requestError.response.data?.message || 'Unable to verify this certificate right now.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routeCertNo]);

  const verify = event => {
    event.preventDefault();
    const normalized = certNo.trim().toUpperCase();
    if (!/^SOL-\d{4}-\d{6}$/.test(normalized)) {
      setResult(null);
      setError('Enter a certificate number in the format SOL-YYYY-000123.');
      return;
    }
    navigate(`/verify/${encodeURIComponent(normalized)}`);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-5">
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-card sm:p-10">
        <Link to="/" aria-label="SUN SOLAR home" className="inline-flex items-center">
          <BrandLogo className="h-14 w-36" />
        </Link>
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">PUBLIC CERTIFICATE CHECK</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Verify clean-energy impact</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Enter the number printed on a Sunwise certificate to confirm its integrity.</p>

        <form onSubmit={verify} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-xs font-semibold text-ink">Certificate number
            <input required pattern="SOL-[0-9]{4}-[0-9]{6}" value={certNo} onChange={event => setCertNo(event.target.value.toUpperCase())} placeholder="SOL-2026-000123" className="form-input mt-1" />
          </label>
          <button disabled={loading} className="self-end rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-50">{loading ? 'Checking…' : 'Verify'}</button>
        </form>

        {loading && <div className="mt-6"><Loader compact label="Checking certificate hash…" /></div>}
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {result && (
          <section className={`mt-6 rounded-2xl border p-5 ${result.valid ? 'border-leaf/20 bg-lime/20' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-lg font-bold ${result.valid ? 'bg-leaf text-white' : 'bg-red-100 text-red-700'}`}>{result.valid ? '✓' : '!'}</span>
              <div><h2 className={`font-display text-lg font-bold ${result.valid ? 'text-leaf' : 'text-red-700'}`}>{result.valid ? 'Certificate is valid' : 'Certificate integrity check failed'}</h2><p className="text-xs text-muted">{result.certificate?.certNo}</p></div>
            </div>
            {result.certificate && (
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ink/10 pt-4 text-sm">
                <div><dt className="text-xs text-muted">Certificate owner</dt><dd className="mt-1 font-semibold text-ink">{result.certificate.ownerFirstName || 'Not available'}</dd></div>
                <div><dt className="text-xs text-muted">Energy delivered</dt><dd className="mt-1 font-semibold text-ink">{result.certificate.kwh} kWh</dd></div>
                <div><dt className="text-xs text-muted">CO₂ avoided</dt><dd className="mt-1 font-semibold text-ink">{Number(result.certificate.co2AvoidedKg).toFixed(3)} kg</dd></div>
                <div><dt className="text-xs text-muted">Issue date</dt><dd className="mt-1 font-semibold text-ink">{new Date(result.certificate.issuedAt).toLocaleDateString()}</dd></div>
              </dl>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
