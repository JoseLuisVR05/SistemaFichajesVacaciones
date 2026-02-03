import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import{ AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimeClockPage from './pages/Timeclockpage';
import History from './pages/History';
import Corrections from './pages/Corrections';
import Employees from './pages/Employees';
import MainLayout from './components/common/MainLayout';


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
                    <Route path="/employees" element={<Employees />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}