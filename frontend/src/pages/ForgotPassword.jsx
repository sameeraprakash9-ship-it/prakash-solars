import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send reset instructions. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="forgot">
      {sent ? (
        <div className="space-y-5">
          <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/5 px-4 py-3 text-sm leading-6 text-ink">
            If an account exists for that email, password reset instructions will be sent. Check your inbox and spam folder.
          </p>
          <Link className="block text-center text-sm font-bold text-leaf hover:text-ink" to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={80}
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="form-input"
            />
          </label>
          <button disabled={busy} className="primary-button">
            {busy ? 'Sending…' : 'Send reset link'}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
          <p className="text-center text-sm">
            <Link className="font-semibold text-leaf hover:text-ink" to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
