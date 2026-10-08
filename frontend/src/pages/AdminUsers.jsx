import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const pageSize = 10;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [applied, setApplied] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async page => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(applied).filter(([, value]) => value));
      const { data } = await api.get('/admin/users', { params: { ...params, page, limit: pageSize } });
      setUsers(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { loadUsers(1); }, [loadUsers]);

  const updateStatus = async user => {
    const status = user.status === 'active' ? 'suspended' : 'active';
    setBusyId(user._id);
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/status`, { status });
      setUsers(current => current.map(item => item._id === data._id ? data : item));
      toast(`${data.name} is now ${status}.`);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to update account status.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: value => <span className="capitalize">{value}</span> },
    { key: 'zone', label: 'Zone' },
    { key: 'status', label: 'Status', render: value => <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${value === 'active' ? 'bg-lime/50 text-leaf' : 'bg-red-100 text-red-700'}`}>{value}</span> },
    { key: 'actions', label: 'Account action', render: (_, user) => <button type="button" disabled={busyId === user._id || (String(user._id) === String(currentUser._id || currentUser.id) && user.status === 'active')} onClick={() => updateStatus(user)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${user.status === 'active' ? 'border-red-200 text-red-700' : 'border-leaf/30 text-leaf'}`}>{user.status === 'active' ? (String(user._id) === String(currentUser._id || currentUser.id) ? 'Your account' : 'Suspend') : 'Activate'}</button> }
  ];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">PLATFORM ACCESS</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Users</h2></div>
      <form onSubmit={event => { event.preventDefault(); setApplied(filters); }} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Search users" placeholder="Search name or email" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} className="form-input" />
        <select aria-label="Filter role" value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })} className="form-input"><option value="">All roles</option><option value="prosumer">Prosumer</option><option value="consumer">Consumer</option><option value="admin">Admin</option></select>
        <select aria-label="Filter status" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} className="form-input"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
        <button className="rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white hover:bg-ink">Apply filters</button>
      </form>
      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadUsers(pagination.page)} /></div>}
      <DataTable columns={columns} data={users} loading={loading} pagination={pagination} onPageChange={loadUsers} emptyMessage="No users found." />
    </section>
  );
}
