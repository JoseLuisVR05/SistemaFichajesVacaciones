import { NavLink } from 'react-router-dom';
import styles from './NavItem.module.css';

/**
 * NavItem Component
 * Item individual de navegación en el sidebar
 * 
 * Props:
 * - to: string - ruta del enlace
 * - icon: ReactNode - icono a mostrar
 * - label: string - texto del item
 * - badge: number - número de notificaciones (opcional)
 * - onClick: function - callback cuando se hace click
 * - submenu: boolean - indica si tiene submenú
 * - isOpen: boolean - si el submenú está abierto
 */
export function NavItem({ 
  to, 
  icon, 
  label, 
  badge, 
  onClick,
  submenu = false,
  isOpen = false,
  children = null,
  collapsed = false
}) {
  const content = (
    <>
      <span className={styles.icon}>{icon}</span>
      {!collapsed && <span className={styles.label}>{label}</span>}
      {!collapsed && badge > 0 && <span className={styles.badge}>{badge}</span>}
      { !collapsed && submenu && (
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
          ›
        </span>
      )}
    </>
  );

  // Si es submenu, solo es un botón
  if (submenu) {
    return (
      <>
        <button className={styles.navItem} onClick={onClick}>
          {content}
        </button>
        {isOpen && children && (
          <div className={styles.submenu}>{children}</div>
        )}
      </>
    );
  }

  // Si no, es un enlace
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.active : ''}`
      }
      onClick={onClick}
    >
      {content}
    </NavLink>
  );
}