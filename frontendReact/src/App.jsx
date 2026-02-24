import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import{ AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimeClockPage from './modules/time/clock/Timeclockpage';
import History from './modules/time/history/History';
import Corrections from './modules/time/corrections/Corrections';
import Employees from './modules/employees/detail/Employees';
import MainLayout from './components/common/MainLayout';
import VacationRequests from './modules/vacations/requests/VacationRequests';
import VacationApprovals from './modules/vacations/approvals/VacationApprovals';
import VacationCalendar from './modules/vacations/calendar/VacationCalendar';
import AdminPanel from './modules/admin/AdminPanel';


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/timeclock" element={<TimeClockPage />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/corrections" element={<Corrections />} />
                    <Route 
                      path="/employees" 
                      element={
                        <ProtectedRoute roles={['ADMIN', 'RRHH', 'MANAGER']}>
                          <Employees />
                        </ProtectedRoute>
                      }
                    />
                    
                    <Route path="/vacations/requests" element={<VacationRequests/>} />
                    <Route 
                      path="/vacations/approvals" 
                      element={
                        <ProtectedRoute roles={['ADMIN', 'RRHH', 'MANAGER']}>
                          <VacationApprovals />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/vacations/calendar" element={<VacationCalendar/>} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute roles={['ADMIN', 'RRHH']}>
                          <AdminPanel />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/login" />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}