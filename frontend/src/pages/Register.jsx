import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { dashboardPath } from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'consumer',
    zone: 'zone-1'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={dashboardPath(user.role)} replace />;

  const submit = async event => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    const email = form.email.trim();
    const zone = form.zone.trim();
    if (name.length < 2) {
      setError('Enter a name with at least 2 characters.');
      return;
    }
    if (!email || !zone || form.password.length < 6) {
      setError('Enter a valid email, energy zone, and password with at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const registeredUser = await register({ ...form, name, email, zone });
      navigate(dashboardPath(registeredUser.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout mode="register">
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Full name</span>
          <input
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            pattern=".*\S.*"
            value={form.name}
            onChange={event => setForm({ ...form, name: event.target.value })}
            placeholder="Your name"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Email address</span>
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={80}
            value={form.email}
            onChange={event => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
            className="form-input"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">I’m joining as</span>
            <select
              value={form.role}
              onChange={event => setForm({ ...form, role: event.target.value })}
              className="form-input"
            >
              <option value="consumer">Energy consumer</option>
              <option value="prosumer">Solar prosumer</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Energy zone</span>
            <input
              type="text"
              required
              maxLength={80}
              pattern=".*\S.*"
              value={form.zone}
              onChange={event => setForm({ ...form, zone: event.target.value })}
              className="form-input"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={form.password}
            onChange={event => setForm({ ...form, password: event.target.value })}
            placeholder="At least 6 characters"
            className="form-input"
          />
        </label>
        <button disabled={busy} className="primary-button">
          {busy ? 'Creating account…' : 'Create account'}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
        <p className="pt-1 text-center text-sm text-muted">
          Already have an account? <Link className="font-bold text-leaf hover:text-ink" to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
