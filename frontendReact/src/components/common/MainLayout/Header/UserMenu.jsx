import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, Menu, MenuItem, Divider } from '@mui/material';
import { Logout as LogoutIcon, Settings as SettingsIcon } from '@mui/icons-material';
import styles from './UserMenu.module.css';

/**
 * UserMenu Component
 * Menú dropdown del usuario
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <button className={styles.trigger} onClick={handleOpen}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'rgb(170, 24, 44)',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {user?.employeeName?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
      </button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          className: styles.menu,
        }}
      >
        {/* Header del menú con info del usuario */}
        <div className={styles.userHeader}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgb(170, 24, 44)',
              fontSize: 20,
            }}
          >
            {user?.employeeName?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.employeeName}</p>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>

        <Divider />

        <MenuItem onClick={handleLogout} className={styles.logout}>
          <LogoutIcon sx={{ mr: 1.5 }} fontSize="small" />
          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  );
}