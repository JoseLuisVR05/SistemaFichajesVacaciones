import { useAuth } from '../context/AuthContext';

export const useRole = () => {
  const { user } = useAuth();
  
  const hasRole = (rolesToCheck) => {
    if (!user?.role) {
      console.log('NO hay rol en user:', user);
      return false;
    }
    
    // Normalizar: convertir a array si no lo es
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const rolesToCheckArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    
    // Verifica si el usuario tiene alguno de los roles requeridos
    return rolesToCheckArray.some(role => userRoles.includes(role));
  };
  
  const isAdmin = () => hasRole('ADMIN');
  const isRRHH = () => hasRole('RRHH');
  const isManager = () => hasRole('MANAGER');
  const isEmployee = () => hasRole('EMPLOYEE');
  
  const canManageEmployees = () => hasRole(['ADMIN', 'RRHH', 'MANAGER']);
  const canManageCorrections = () => hasRole(['ADMIN', 'RRHH', 'MANAGER']);
  const canViewAllEmployees = () => hasRole(['ADMIN', 'RRHH']);
  const canViewEmployees = () => hasRole(['ADMIN', 'RRHH', 'MANAGER']);
  
  return {
    hasRole,
    isAdmin,
    isRRHH,
    isManager,
    isEmployee,
    canManageEmployees,
    canManageCorrections,
    canViewAllEmployees,
    canViewEmployees,
    roles: Array.isArray(user?.role) ? user.role : [user?.role].filter(Boolean),
    primaryRole: Array.isArray(user?.role) ? user.role[0] : user?.role
  };
};