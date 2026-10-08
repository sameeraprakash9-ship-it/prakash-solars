import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import WorkspaceHero from '../components/WorkspaceHero';

const pageSize = 10;

const notificationLabels = {
  match_created: 'New match',
  match_confirmed: 'Match confirmed',
  match_rejected: 'Match update',
  settlement_completed: 'Trade settled',
  dispute_comment: 'Dispute update',
  dispute_resolved: 'Dispute resolved'
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async page => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', {
        params: {
          page,
          limit: pageSize,
          ...(filter === 'unread' ? { unread: 'true' } : {})
        }
      });
      setNotifications(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadNotifications(1); }, [loadNotifications]);

  const markRead = async notification => {
    setBusyId(notification._id);
    try {
      await api.patch(`/notifications/${notification._id}/read`);
      if (filter === 'unread') {
        await loadNotifications(pagination.page);
      } else {
        setNotifications(current => current.map(item =>
          item._id === notification._id ? { ...item, read: true } : item
        ));
      }
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark this notification as read.');
    } finally {
      setBusyId('');
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      if (filter === 'unread') {
        await loadNotifications(1);
      } else {
        setNotifications(current => current.map(item => ({ ...item, read: true })));
      }
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async notification => {
    setBusyId(notification._id);
    try {
      await api.delete(`/notifications/${notification._id}`);
      const remaining = notifications.filter(item => item._id !== notification._id);
      if (!remaining.length && pagination.page > 1) {
        await loadNotifications(pagination.page - 1);
      } else {
        setNotifications(remaining);
        setPagination(current => ({ ...current, total: Math.max(0, current.total - 1) }));
      }
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete this notification.');
    } finally {
      setBusyId('');
    }
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <div className="space-y-6">
      <WorkspaceHero
        variant="notification"
        eyebrow="STAY IN THE LOOP"
        title="Notifications"
        description="Updates about your matches, completed trades, and dispute conversations."
      />

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Your updates</h2>
            <p className="mt-1 text-xs text-muted">{pagination.total} {pagination.total === 1 ? 'notification' : 'notifications'} · {unreadCount} unread on this page</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="notification-filter">Notification filter</label>
            <select
              id="notification-filter"
              value={filter}
              onChange={event => setFilter(event.target.value)}
              className="form-input min-w-36"
            >
              <option value="all">All updates</option>
              <option value="unread">Unread only</option>
            </select>
            <button
              type="button"
              disabled={markingAll || (filter === 'unread' && pagination.total === 0)}
              onClick={markAllRead}
              className="rounded-xl border border-ink/10 px-3 py-2.5 text-xs font-bold text-ink hover:border-leaf disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadNotifications(pagination.page)} /></div>}

        {loading ? <Loader compact label="Loading notifications…" /> : notifications.length === 0 ? (
          <div className="rounded-2xl bg-canvas px-5 py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lime/60 text-2xl text-ink" aria-hidden="true">♧</div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">You’re all caught up</h3>
            <p className="mt-2 text-sm text-muted">{filter === 'unread' ? 'There are no unread updates.' : 'Trade and account updates will appear here.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <article
                key={notification._id}
                className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                  notification.read ? 'border-ink/5 bg-white' : 'border-leaf/15 bg-[#f6faf5]'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${
                    notification.read ? 'bg-canvas text-muted' : 'bg-lime/70 text-leaf'
                  }`} aria-hidden="true">✳</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-leaf">
                        {notificationLabels[notification.type] || 'Sunwise update'}
                      </p>
                      {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-leaf" aria-label="Unread" />}
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-6 text-ink">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 pl-[3.25rem] sm:pl-0">
                  {!notification.read && (
                    <button
                      type="button"
                      disabled={busyId === notification._id}
                      onClick={() => markRead(notification)}
                      className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold text-leaf hover:border-leaf disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === notification._id}
                    onClick={() => deleteNotification(notification)}
                    className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold text-muted hover:border-red-200 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-ink/5 pt-4">
            <p className="text-xs text-muted">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadNotifications(pagination.page - 1)}
                className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40"
              >Previous</button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadNotifications(pagination.page + 1)}
                className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}