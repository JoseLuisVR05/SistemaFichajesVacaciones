import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useRole } from '../../../../hooks/useRole';
import logo from '../../../../assets/la.png';
import logo2 from '../../../../assets/bg-mission_sm-eF42QH3n.png';
import {
  Dashboard as DashboardIcon,
  AccessTime as AccessTimeIcon,
  History as HistoryIcon,
  EditNote as EditNoteIcon,
  AdminPanelSettings,
  BeachAccess as BeachIcon,
  CalendarMonth,
  RequestPage,
  ThumbUpAlt,
  People,
} from '@mui/icons-material';

import { useTranslation } from 'react-i18next';
import { NavItem } from './NavItem';
import styles from './Sidebar.module.css';

/**
 * Sidebar Component
 * Navegación principal de la aplicación
 */
export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const { hasRole } = useRole();
  const { t } = useTranslation();

  // Estado para submenús
  const [vacationsOpen, setVacationsOpen] = useState(false);
  

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
          label={t('nav.dashboard')}
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/timeclock"
          icon={<AccessTimeIcon />}
          label={t('nav.timeclock')}
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/history"
          icon={<HistoryIcon />}
          label={t('nav.history')}
          onClick={handleNavClick}
          collapsed={collapsed}
        />
        <NavItem
          to="/corrections"
          icon={<EditNoteIcon />}
          label={t('nav.corrections')}
          onClick={handleNavClick}
          collapsed={collapsed}
        />

        {/* Sección Vacaciones (Colapsable) */}
        <NavItem
          icon={<BeachIcon />}
          label={t('nav.vacations')}
          submenu
          isOpen={vacationsOpen && !collapsed}
          onClick={() => !collapsed && setVacationsOpen(!vacationsOpen)}
          collapsed={collapsed}
        >
          <NavItem
            to="/vacations/requests"
            icon={<RequestPage style={{ fontSize: 18 }} />}
            label={t('vacations.tabs.history')}
            onClick={handleNavClick}
            collapsed={collapsed}
          />
          {hasRole(['ADMIN', 'RRHH', 'MANAGER']) && (
            <NavItem
              to="/vacations/approvals"
              icon={<ThumbUpAlt style={{ fontSize: 18 }} />}
              label={t('vacations.approvals.title')}
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          )}
          <NavItem
            to="/vacations/calendar"
            icon={<CalendarMonth style={{ fontSize: 18 }} />}
            label={t('vacations.calendar.title')}
            onClick={handleNavClick}
            collapsed={collapsed}
          />
        </NavItem>

        {/* Items de Admin */}
        {hasRole(['ADMIN', 'RRHH', 'MANAGER']) && (
          <>
            <NavItem
              to="/employees"
              icon={<People />}
              label={t('nav.employees')}
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          </>
        )}

        {hasRole(['ADMIN', 'RRHH']) && (
          <NavItem
            to="/admin"
            icon={<AdminPanelSettings />}
            label={t('nav.admin')}
            onClick={handleNavClick}
            collapsed={collapsed} 
          />
        )}
        
      </nav>
      <div className={styles.footer}>
        <img src={logo2} alt="Mission Logo" className={styles.footerImage} />
      </div>
    </aside>
  );
}