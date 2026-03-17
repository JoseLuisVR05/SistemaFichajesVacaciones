import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div>{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.some(r => user.role?.includes(r))) {
    return <div>Acceso denegado</div>;
  }

  return children;
}