import { useState } from 'react';
import {
  IconButton, Badge, Menu, MenuItem,
  Typography, Divider, Box, ListItemIcon,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft, ChevronRight,
  Notifications as NotificationsIcon,
  EditNote as EditNoteIcon,
  BeachAccess as BeachIcon,
} from '@mui/icons-material';
import { UserMenu } from './UserMenu';
import { LanguageSelector } from './LanguageSelector';
import { useNotifications } from '../../../../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Header.module.css';

export function Header({ onMenuClick, onToggleCollapse, isCollapsed }) {
  const { notifications, count, markSeen } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleNotifClick = (notification) => {
    handleClose();
    markSeen(notification.itemIds);
    navigate(notification.path);
  };

  const ICON = {
    correction: <EditNoteIcon fontSize="small" color="warning" />,
    vacation: <BeachIcon fontSize="small" color="info" />,
  };

  return (
    <header className={styles.header}>
      {/* Botón de menú (mobile) */}
      <button className={styles.mobileMenuButton} onClick={onMenuClick}>
        <MenuIcon />
      </button>

      {/* Botón de colapso (desktop) */}
      <button className={styles.desktopToggleButton} onClick={onToggleCollapse}>
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      <div className={styles.spacer} />

      <div className={styles.controls}>

        {/* Campana de notificaciones */}
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={count} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>

        {/* Dropdown de notificaciones */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { minWidth: 300, mt: 1 } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {t('notifications.title')}
            </Typography>
          </Box>

          <Divider />

          {notifications.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {t('notifications.empty')}
              </Typography>
            </MenuItem>
          ) : (
            notifications.map((n) => (
              <MenuItem
                key={n.id}
                onClick={() => handleNotifClick(n)}
                sx={{ gap: 1.5, py: 1.2 }}
              >
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  {ICON[n.type]}
                </ListItemIcon>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {t(n.messageKey, { count: n.count })}
                </Typography>
                <Badge
                  badgeContent={n.count}
                  color={n.type === 'correction' ? 'warning' : 'info'}
                  sx={{ ml: 1 }}
                />
              </MenuItem>
            ))
          )}
        </Menu>

        <LanguageSelector />
        <UserMenu />
      </div>
    </header>
  );
}