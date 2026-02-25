import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useRole } from '../../../../hooks/useRole';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCorrections } from '../../../../services/correctionsService';
import { getVacationRequests } from '../../../../services/vacationsService';
import logo from '../../../../assets/la.png';
import {
  Dashboard as DashboardIcon,
  AccessTime as AccessTimeIcon,
  History as HistoryIcon,
  EditNote as EditNoteIcon,
  Event as EventIcon,
  People as PeopleIcon,
  AdminPanelSettings,
  BeachAccess as BeachIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ExpandLess,
  ExpandMore,
  CalendarMonth,
  RequestPage,
  ThumbUpAlt,
  AccountBalanceWallet,
} from '@mui/icons-material';

import { NavItem } from './NavItem';
import styles from './Sidebar.module.css';

/**
 * Sidebar Component
 * Navegación principal de la aplicación
 */
export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const { hasRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para submenús
  const [vacationsOpen, setVacationsOpen] = useState(false);
  

  // Notificaciones
  const [pendingCorrections, setPendingCorrections] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Cargar notificaciones
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Correcciones pendientes
      const corrections = await getCorrections({ status: 'PENDING', includeOwn: true });
      const myCorrections = (Array.isArray(corrections) ? corrections : [])
        .filter(c => c.employeeId === user?.employeeId);
      setPendingCorrections(myCorrections.length);

      // Aprobaciones pendientes
      if (hasRole(['ADMIN', 'RRHH', 'MANAGER'])) {
        const approvals = await getVacationRequests({ status: 'SUBMITTED' });
        setPendingApprovals((Array.isArray(approvals) ? approvals : []).length);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  // Cerrar sidebar al navegar en mobile
  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <aside
      className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''} ${collapsed ? styles.collapsed : ''}`}
      role="navigation"
      aria-label="Navegación principal"
    >
      {/* Header del Sidebar */}
      <div className={styles.header}>
          <div className={styles.logo}>
            <img src={logo} alt="Logo" className={styles.logoImage} />
          </div>       
      </div>

      {/* Navegación */}
      <nav className={styles.nav}>
        {/* Items principales */}
        <NavItem
          to="/dashboard"
          icon={<DashboardIcon />}
          label="Dashboard"
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/timeclock"
          icon={<AccessTimeIcon />}
          label="Fichaje"
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/history"
          icon={<HistoryIcon />}
          label="Historial"
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/corrections"
          icon={<EditNoteIcon />}
          label="Correcciones"
          badge={pendingCorrections}
          onClick={handleNavClick}
          collapsed={collapsed}
        />

        {/* Sección Vacaciones (Colapsable) */}
        <NavItem
          icon={<BeachIcon />}
          label="Vacaciones"
          submenu
          isOpen={vacationsOpen && !collapsed}
          onClick={() => !collapsed && setVacationsOpen(!vacationsOpen)}
          collapsed={collapsed}
        >
          <NavItem
            to="/vacations/requests"
            icon={<RequestPage style={{ fontSize: 18 }} />}
            label="Mis solicitudes"
            onClick={handleNavClick}
            collapsed={collapsed}
          />
          {hasRole(['ADMIN', 'RRHH', 'MANAGER']) && (
            <NavItem
              to="/vacations/approvals"
              icon={<ThumbUpAlt style={{ fontSize: 18 }} />}
              label="Aprobaciones"
              badge={pendingApprovals}
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          )}
          <NavItem
            to="/vacations/calendar"
            icon={<CalendarMonth style={{ fontSize: 18 }} />}
            label="Calendario"
            onClick={handleNavClick}
            collapsed={collapsed}
          />
        </NavItem>

        {/* Items de Admin */}
        {hasRole(['ADMIN', 'RRHH', 'MANAGER']) && (
          <>
            <NavItem
              to="/employees"
              /*icon={<People />}*/
              label="Empleados"
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          </>
        )}

        {hasRole(['ADMIN', 'RRHH']) && (
          <NavItem
            to="/admin"
            icon={<AdminPanelSettings />}
            label="Admin"
            onClick={handleNavClick}
            collapsed={collapsed} 
          />
        )}
      </nav>
    </aside>
  );
}