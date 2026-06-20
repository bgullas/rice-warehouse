import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WarehousePage from './pages/WarehousePage';
import ContainerLogPage from './pages/ContainerLogPage';
import ContainerFormPage from './pages/ContainerFormPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import MobileLayout from './mobile/MobileLayout';
import MobileOverview from './mobile/MobileOverview';
import MobileAddContainer from './mobile/MobileAddContainer';
import MobileCheckout from './mobile/MobileCheckout';

function PrivateRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const home = isMobile ? '/m' : '/';
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="containers" element={<ContainerLogPage />} />
        <Route path="containers/new" element={<ContainerFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<PrivateRoute adminOnly><SettingsPage /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
      </Route>
      <Route path="/m" element={<PrivateRoute><MobileLayout /></PrivateRoute>}>
        <Route index element={<MobileOverview />} />
        <Route path="add" element={<MobileAddContainer />} />
        <Route path="checkout" element={<MobileCheckout />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
