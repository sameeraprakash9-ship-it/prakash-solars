import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout, { WorkspacePage } from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Certificates from './pages/Certificates';
import Bids from './pages/Bids';
import ConsumerDashboard from './pages/ConsumerDashboard';
import Dashboard from './pages/Dashboard';
import Disputes from './pages/Disputes';
import AdminDashboard from './pages/AdminDashboard';
import AdminMeters from './pages/AdminMeters';
import AdminReports from './pages/AdminReports';
import AdminUsers from './pages/AdminUsers';
import GridConfig from './pages/GridConfig';
import Listings from './pages/Listings';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Marketplace from './pages/Marketplace';
import Matches from './pages/Matches';
import Meters from './pages/Meters';
import ProsumerDashboard from './pages/ProsumerDashboard';
import PricingRules from './pages/PricingRules';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Transactions from './pages/Transactions';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import VerifyCertificate from './pages/VerifyCertificate';
import Wallet from './pages/Wallet';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? `/dashboard/${user.role}` : '/login'} replace />;
}

function RoleDashboard({ role, children }) {
  return (
    <ProtectedRoute roles={[role]}>
      {children || <Dashboard />}
    </ProtectedRoute>
  );
}

function ProsumerWorkspace({ children }) {
  const { user } = useAuth();
  return user.role === 'prosumer' ? children : <WorkspacePage />;
}

function ConsumerWorkspace({ children }) {
  const { user } = useAuth();
  return user.role === 'consumer' ? children : <WorkspacePage />;
}

function AdminWorkspace({ children }) {
  const { user } = useAuth();
  return user.role === 'admin' ? children : <WorkspacePage />;
}

function RoleMeters() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminMeters />;
  if (user.role === 'prosumer') return <Meters />;
  return <WorkspacePage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify" element={<VerifyCertificate />} />
      <Route path="/verify/:certNo" element={<VerifyCertificate />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard/prosumer" element={<RoleDashboard role="prosumer"><ProsumerDashboard /></RoleDashboard>} />
          <Route path="/dashboard/consumer" element={<RoleDashboard role="consumer"><ConsumerDashboard /></RoleDashboard>} />
          <Route path="/dashboard/admin" element={<RoleDashboard role="admin"><AdminDashboard /></RoleDashboard>} />
          <Route path="/workspace/meters" element={<RoleMeters />} />
          <Route path="/workspace/listings" element={<ProsumerWorkspace><Listings /></ProsumerWorkspace>} />
          <Route path="/workspace/marketplace" element={<ConsumerWorkspace><Marketplace /></ConsumerWorkspace>} />
          <Route path="/workspace/matches" element={<Matches />} />
          <Route path="/workspace/transactions" element={<Transactions />} />
          <Route path="/workspace/certificates" element={<Certificates />} />
          <Route path="/workspace/bids" element={<ConsumerWorkspace><Bids /></ConsumerWorkspace>} />
          <Route path="/workspace/wallet" element={<Wallet />} />
          <Route path="/workspace/reports" element={<AdminWorkspace><AdminReports /></AdminWorkspace>} />
          <Route path="/workspace/users" element={<AdminWorkspace><AdminUsers /></AdminWorkspace>} />
          <Route path="/workspace/grid" element={<AdminWorkspace><GridConfig /></AdminWorkspace>} />
          <Route path="/workspace/disputes" element={<Disputes />} />
          <Route path="/workspace/pricing" element={<AdminWorkspace><PricingRules /></AdminWorkspace>} />
          <Route path="/workspace/notifications" element={<Notifications />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
