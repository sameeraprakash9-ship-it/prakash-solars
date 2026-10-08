import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function dashboardPath(role) {
  return role ? `/dashboard/${role}` : '/login';
}

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-leaf">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime" />
          Restoring your workspace…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to={dashboardPath(user.role)} replace />;

  return children || <Outlet />;
}
