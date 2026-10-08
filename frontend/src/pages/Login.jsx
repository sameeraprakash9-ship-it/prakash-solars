import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { dashboardPath } from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && user) return <Navigate to={dashboardPath(user.role)} replace />;

  const submit = async event => {
    event.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) {
      setError('Enter both your email address and password.');
      return;
    }
    setBusy(true);
    try {
      const loggedInUser = await login({ ...form, email });
      navigate(dashboardPath(loggedInUser.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || (
        requestError.code === 'ERR_NETWORK'
          ? 'Can’t reach the Sunwise API. Start the backend and make sure MongoDB is connected, then try again.'
          : 'Unable to sign in right now. Please try again.'
      ));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Email address</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={event => setForm({ ...form, email: event.target.value })}
            onBlur={event => setForm({ ...form, email: event.target.value.trim().toLowerCase() })}
            placeholder="you@example.com"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              minLength={6}
              required
              value={form.password}
              onChange={event => setForm({ ...form, password: event.target.value })}
              placeholder="Enter your password"
              className="form-input pr-20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(visible => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-3 my-auto h-fit rounded-lg px-2 py-1 text-xs font-semibold text-leaf hover:bg-leaf/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button disabled={busy} className="primary-button">
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
        <p className="text-center text-sm">
          <Link className="font-semibold text-leaf hover:text-ink" to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="pt-2 text-center text-sm text-muted">
          New to Sunwise? <Link className="font-bold text-leaf hover:text-ink" to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
