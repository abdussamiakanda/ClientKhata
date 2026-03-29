import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { PageLoader } from './components/PageLoader/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ClientsPage } from './components/ClientsPage';
import { ClientDetailPage } from './components/ClientDetailPage';
import { JobsPage } from './components/JobsPage';
import { JobDetailPage } from './components/JobDetailPage';
import { JobInvoicePage } from './components/JobInvoicePage';
import { PaymentsPage } from './components/PaymentsPage/PaymentsPage';
import { Settings } from './components/Settings';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader text="Loading..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/" element={<Outlet />}>
        <Route index element={<LandingPage />} />
        <Route path="invoice/:jobId" element={<JobInvoicePage />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="client/:clientId" element={<ClientDetailPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="job/:jobId" element={<JobDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
