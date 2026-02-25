import { useState } from 'react';
import { IconButton, Badge } from '@mui/material';
import { Menu as MenuIcon, ChevronLeft,ChevronRight, Notifications as NotificationsIcon } from '@mui/icons-material';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

/**
 * Header Component
 * Barra superior con notificaciones y menú de usuario
 */
export function Header({ onMenuClick , onToggleCollapse}) {
  const [notificationCount] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

// Función para manejar el clic y avisar al padre
  const handleToggle = () => {
    setIsOpen(!isOpen); // Cambia el estado local para la flecha
    if (onToggleCollapse) onToggleCollapse(); // Avisa al componente padre para que cierre la columna
  };

  return (
    <header className={styles.header}>
      {/* Botón de menú (mobile) */}
      <button className={styles.mobileMenuButton} onClick={onMenuClick}>
        <MenuIcon />
      </button>
      {/* Botón de colapso (desktop) */}
      <button className={styles.desktopToggleButton} onClick={handleToggle}>
        {isOpen ? <ChevronLeft /> : <ChevronRight />}
      </button>

      {/* Spacer para centrar contenido */}
      <div className={styles.spacer} />

      {/* Controles a la derecha */}
      <div className={styles.controls}>
        {/* Notificaciones */}
        <IconButton>
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>

        {/* Menú de usuario */}
        <UserMenu />
      </div>
    </header>
  );
}