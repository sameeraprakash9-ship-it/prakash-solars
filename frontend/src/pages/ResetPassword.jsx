import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
      setReset(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reset your password. Please request a new link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="reset">
      {reset ? (
        <div className="space-y-5">
          <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/5 px-4 py-3 text-sm leading-6 text-ink">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Link className="primary-button" to="/login">Go to sign in <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="form-input"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Enter the password again"
              className="form-input"
            />
          </label>
          <button disabled={busy} className="primary-button">
            {busy ? 'Updating…' : 'Update password'}
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
