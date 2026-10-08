import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ErrorMessage from './ErrorMessage';
import Loader from './Loader';
import DataTable from './DataTable';
import BrandLogo from './BrandLogo';

const menus = {
  prosumer: [
    ['Overview', '/dashboard/prosumer', '⌂'],
    ['My meters', '/workspace/meters', '▦'],
    ['Energy listings', '/workspace/listings', '↗'],
    ['Matches', '/workspace/matches', '⇄'],
    ['Wallet', '/workspace/wallet', '◉'],
    ['Transactions', '/workspace/transactions', '▤'],
    ['Disputes', '/workspace/disputes', '⚑'],
    ['Certificates', '/workspace/certificates', '✳']
  ],
  consumer: [
    ['Overview', '/dashboard/consumer', '⌂'],
    ['Marketplace', '/workspace/marketplace', '⌕'],
    ['My bids', '/workspace/bids', '↗'],
    ['Matches', '/workspace/matches', '⇄'],
    ['Wallet', '/workspace/wallet', '◉'],
    ['Transactions', '/workspace/transactions', '▤'],
    ['Disputes', '/workspace/disputes', '⚑'],
    ['Certificates', '/workspace/certificates', '✳']
  ],
  admin: [
    ['Overview', '/dashboard/admin', '⌂'],
    ['Reports', '/workspace/reports', '▥'],
    ['Users', '/workspace/users', '♙'],
    ['Meters', '/workspace/meters', '▦'],
    ['Grid config', '/workspace/grid', '⌁'],
    ['Disputes', '/workspace/disputes', '⚑'],
    ['Pricing', '/workspace/pricing', '$'],
    ['Transactions', '/workspace/transactions', '▤']
  ]
};

const sectionTitles = {
  meters: 'Meters',
  listings: 'Energy listings',
  marketplace: 'Marketplace',
  matches: 'Matches',
  wallet: 'Wallet',
  transactions: 'Transactions',
  certificates: 'Certificates',
  bids: 'My bids',
  reports: 'Platform reports',
  users: 'User management',
  grid: 'Grid configuration',
  disputes: 'Disputes',
  pricing: 'Pricing rules',
  settlements: 'Settle transactions',
  notifications: 'Notifications'
};

function Brand() {
  return (
    <Link to="/" aria-label="SUN SOLAR home" className="flex items-center px-5 py-4">
      <BrandLogo className="h-14 w-36" />
    </Link>
  );
}

function Sidebar({ user, currentPath, close }) {
  const menu = menus[user.role] || [];
  const navigation = user.role === 'admin'
    ? [...menu, ['Notifications', '/workspace/notifications', '♧']]
    : [...menu, ['Notifications', '/workspace/notifications', '♧']];

  return (
    <aside className="flex h-full w-64 flex-col bg-ink">
      <Brand />
      <div className="px-5 pb-4 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label={`${user.role} navigation`}>
        {navigation.map(([label, to, icon]) => (
          <NavLink
            key={to}
            to={to}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive || (to === '/workspace/notifications' && currentPath === to)
                  ? 'bg-white/10 text-lime'
                  : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/5 text-sm">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold text-white">Clean energy, closer.</p>
        <p className="mt-1 text-[11px] leading-5 text-white/45">Every local trade helps build a brighter grid.</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-lime" />
        </div>
      </div>
    </aside>
  );
}

function NotificationBell({ unreadCount, items, open, onToggle, loading, error, onRetry }) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={onToggle}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white text-lg text-ink transition hover:border-leaf/40"
      >
        ♧
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-leaf px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink">Notifications</p>
              <p className="text-[11px] text-muted">{unreadCount} unread</p>
            </div>
            <Link to="/workspace/notifications" className="text-xs font-bold text-leaf hover:text-ink" onClick={onToggle}>
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? <Loader compact label="Checking notifications…" /> : null}
            {error ? <div className="p-2"><ErrorMessage message={error} onRetry={onRetry} /></div> : null}
            {!loading && !error && items.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted">You’re all caught up.</p>
            )}
            {!loading && !error && items.map(item => (
              <Link
                key={item._id}
                to="/workspace/notifications"
                onClick={onToggle}
                className="block rounded-xl px-3 py-3 transition hover:bg-canvas"
              >
                <p className="text-xs font-semibold text-ink">{item.message}</p>
                <p className="mt-1 text-[10px] text-muted">{new Date(item.createdAt).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkspacePage() {
  const { pathname } = useLocation();
  const section = pathname.split('/').pop();
  const title = sectionTitles[section] || 'Workspace';

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">SUNWISE WORKSPACE</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          This section is ready for your {title.toLowerCase()} data and actions. Use the navigation to move between your role-specific tools.
        </p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <DataTable
          columns={[{ key: 'record', label: 'Records' }, { key: 'details', label: 'Details' }, { key: 'status', label: 'Status' }]}
          data={[]}
          pagination={{ page: 1, limit: 10, total: 0, pages: 0 }}
          emptyMessage={`No ${title.toLowerCase()} to display yet.`}
        />
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const hasLoadedUnread = useRef(false);
  const unreadCountRef = useRef(0);

  const refreshNotifications = useCallback(async (includeItems = false) => {
    if (includeItems) setNotificationsLoading(true);
    try {
      const { data } = await api.get('/notifications', {
        params: { unread: 'true', page: 1, limit: includeItems ? 5 : 1 }
      });
      const nextCount = data.pagination?.total || 0;
      if (hasLoadedUnread.current && nextCount > unreadCountRef.current)
        toast('You have a new notification.');
      unreadCountRef.current = nextCount;
      setUnreadCount(nextCount);
      if (includeItems) setNotifications(data.data || []);
      setNotificationsError('');
      hasLoadedUnread.current = true;
    } catch (error) {
      setNotificationsError(
        error.response?.data?.message || 'Unable to load notifications.'
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(() => refreshNotifications(), 60000);
    return () => window.clearInterval(interval);
  }, [refreshNotifications, loadVersion]);

  const navigationTitle = useMemo(
    () => pathname.startsWith('/dashboard') ? 'Overview' : sectionTitles[pathname.split('/').pop()] || 'Workspace',
    [pathname]
  );

  const toggleNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) refreshNotifications(true);
  };

  const retryNotifications = () => {
    refreshNotifications(true);
  };

  const handleLogout = () => {
    logout();
    toast('You have been signed out.');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <Sidebar user={user} currentPath={pathname} />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-ink/45"
          />
          <div className="relative h-full w-72 max-w-[85vw] shadow-2xl">
            <Sidebar user={user} currentPath={pathname} close={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/95 backdrop-blur">
          <div className="flex h-[4.5rem] items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-lg text-ink lg:hidden"
              >
                ☰
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Your workspace</p>
                <h1 className="truncate text-sm font-bold text-ink">{navigationTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <label className="hidden items-center gap-2 rounded-xl border border-ink/10 bg-canvas px-3 py-2 md:flex">
                <span className="text-muted">⌕</span>
                <input aria-label="Search" placeholder="Search your workspace" className="w-40 bg-transparent text-xs outline-none placeholder:text-muted xl:w-56" />
                <kbd className="rounded border border-ink/10 bg-white px-1.5 py-0.5 text-[9px] text-muted">⌘ K</kbd>
              </label>
              <NotificationBell
                unreadCount={unreadCount}
                items={notifications}
                open={notificationsOpen}
                onToggle={toggleNotifications}
                loading={notificationsLoading}
                error={notificationsError}
                onRetry={retryNotifications}
              />
              <div className="hidden h-8 w-px bg-ink/10 sm:block" />
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-ink">{user.name}</p>
                <p className="text-[10px] capitalize text-muted">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink hover:border-leaf hover:text-leaf"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[90rem] px-4 py-7 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
