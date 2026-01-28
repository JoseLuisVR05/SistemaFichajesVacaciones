import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import{ AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
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
                    <Route path="/history" element={<History />} />
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