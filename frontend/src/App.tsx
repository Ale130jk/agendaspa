import { Outlet, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AppLayout, ScrollToTop } from './components/AppLayout';
import { RequireRole } from './components/ProtectedRoute';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminServicesPage } from './pages/admin/AdminServicesPage';
import { AdminStaffDetailPage } from './pages/admin/AdminStaffDetailPage';
import { AdminStaffPage } from './pages/admin/AdminStaffPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { StaffAgendaPage } from './pages/StaffAgendaPage';

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route
            path="reservar"
            element={
              <RequireRole roles={['CLIENT']}>
                <BookingPage />
              </RequireRole>
            }
          />
          <Route
            path="mis-reservas"
            element={
              <RequireRole roles={['CLIENT']}>
                <MyBookingsPage />
              </RequireRole>
            }
          />
          <Route
            path="agenda"
            element={
              <RequireRole roles={['STAFF', 'ADMIN']}>
                <StaffAgendaPage />
              </RequireRole>
            }
          />
          <Route
            path="admin"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="servicios" element={<AdminServicesPage />} />
            <Route path="staff" element={<AdminStaffPage />} />
            <Route path="staff/:staffId" element={<AdminStaffDetailPage />} />
            <Route path="reservas" element={<AdminBookingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
