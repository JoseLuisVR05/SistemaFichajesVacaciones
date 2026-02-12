import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { getCorrections } from '../../services/correctionsService';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu,
  MenuItem, Badge, Collapse, InputBase
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccessTime as AccessTimeIcon,
  History as HistoryIcon,
  EditNote as EditNoteIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  AccountCircle,
  Notifications,
  Settings,
  BeachAccess as BeachIcon,
  ExpandLess,
  ExpandMore,
  CalendarMonth,
  RequestPage,
  ThumbUpAlt,
  AccountBalanceWallet,
  Search as SearchIcon
} from '@mui/icons-material';

const drawerWidth = 260;

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { hasRole } = useRole();

  // ─── Submenú Vacaciones colapsable ────────────────────
  const [vacationsOpen, setVacationsOpen] = useState(
    location.pathname.startsWith('/vacations')
  );

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  // ─── Buscador en topbar ───────────────────────────────
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Abrir submenú vacaciones si la ruta actual es de vacaciones
  useEffect(() => {
    if (location.pathname.startsWith('/vacations')) {
      setVacationsOpen(true);
    }
  }, [location.pathname]);

  const loadNotifications = async () => {
    try {
      // ✅ CORREGIDO: paréntesis de getItem estaban mal colocados
      const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      let allNotifs = [];

      if (hasRole(['ADMIN', 'RRHH', 'MANAGER'])) {
        const pendingToApprove = await getCorrections({ status: 'PENDING' });
        const forMe = pendingToApprove.filter(c => c.employeeId !== user?.employeeId);

        const myRecent = await getCorrections({
          includeOwn: true,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        const myResolved = myRecent.filter(c =>
          (c.status === 'APPROVED' || c.status === 'REJECTED') &&
          new Date(c.approvedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        const pendingNotifs = forMe.map(c => ({
          id: `pending-${c.correctionId}`,
          type: 'PENDING',
          title: 'Corrección pendiente',
          message: `${c.employeeName} solicita corrección del ${new Date(c.date).toLocaleDateString('es-ES')}`,
          date: c.createdAt
        }));

        const resolvedNotifs = myResolved.map(c => ({
          id: `resolved-${c.correctionId}`,
          type: 'RESOLVED',
          title: c.status === 'APPROVED' ? '✅ Corrección aprobada' : '❌ Corrección rechazada',
          message: `Tu corrección del ${new Date(c.date).toLocaleDateString('es-ES')}`,
          date: c.approvedAt
        }));

        const filteredResolved = resolvedNotifs.filter(n => !readIds.includes(n.id));
        allNotifs = [...pendingNotifs, ...filteredResolved];
      } else {
        const myRecent = await getCorrections({
          includeOwn: true,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        const myResolved = myRecent.filter(c =>
          (c.status === 'APPROVED' || c.status === 'REJECTED') &&
          c.approvedAt &&
          new Date(c.approvedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        const notifs = myResolved.map(c => ({
          id: `resolved-${c.correctionId}`,
          type: c.status,
          title: c.status === 'APPROVED' ? '✅ Corrección aprobada' : '❌ Corrección rechazada',
          message: `Tu corrección del ${new Date(c.date).toLocaleDateString('es-ES')}`,
          date: c.approvedAt
        }));

        allNotifs = notifs.filter(n => !readIds.includes(n.id));
      }

      setNotifications(allNotifs);
      setUnreadCount(allNotifs.length);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
    const resolvedIds = notifications.filter(n => n.type === 'RESOLVED').map(n => n.id);
    if (resolvedIds.length > 0) {
      const oldReadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const updatedReadIds = [...new Set([...oldReadIds, ...resolvedIds])];
      localStorage.setItem('readNotifications', JSON.stringify(updatedReadIds));
      const pendingCount = notifications.filter(n => n.type === 'PENDING').length;
      setUnreadCount(pendingCount);
    }
  };

  const handleNotificationClose = () => setNotificationAnchor(null);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Navegación principal (sin vacaciones) ────────────
  const mainMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', color: '#667eea' },
    { text: 'Fichajes', icon: <AccessTimeIcon />, path: '/timeclock', color: '#f093fb' },
    { text: 'Histórico', icon: <HistoryIcon />, path: '/history', color: '#4facfe' },
    { text: 'Correcciones', icon: <EditNoteIcon />, path: '/corrections', color: '#f5576c' },
    ...(hasRole(['ADMIN', 'RRHH', 'MANAGER'])
      ? [{ text: 'Empleados', icon: <PeopleIcon />, path: '/employees', color: '#43e97b' }]
      : []
    ),
  ];

  // ─── Submenú Vacaciones ───────────────────────────────
  const vacationMenuItems = [
    { text: 'Mi saldo', icon: <AccountBalanceWallet />, path: '/vacations', color: '#ff9a9e' },
    { text: 'Solicitudes', icon: <RequestPage />, path: '/vacations/requests', color: '#a18cd1' },
    ...(hasRole(['ADMIN', 'RRHH', 'MANAGER'])
      ? [{ text: 'Aprobaciones', icon: <ThumbUpAlt />, path: '/vacations/approvals', color: '#fbc2eb' }]
      : []
    ),
    // ✅ CORREGIDO: "Calenario" → "Calendario"
    { text: 'Calendario', icon: <CalendarMonth />, path: '/vacations/calendar', color: '#84fab0' },
  ];

  const renderMenuItem = (item) => (
    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        selected={location.pathname === item.path}
        onClick={() => !item.disabled && navigate(item.path)}
        disabled={item.disabled}
        sx={{
          borderRadius: 2,
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${item.color}22 0%, ${item.color}11 100%)`,
            borderLeft: `4px solid ${item.color}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${item.color}33 0%, ${item.color}22 100%)`,
            }
          },
          '&:hover': { bgcolor: 'grey.100' }
        }}
      >
        <ListItemIcon sx={{ color: location.pathname === item.path ? item.color : 'inherit', minWidth: 40 }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{ fontWeight: location.pathname === item.path ? 600 : 400, fontSize: '0.9rem' }}
        />
      </ListItemButton>
    </ListItem>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Título */}
      <Box sx={{ p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h6" fontWeight="700" gutterBottom>
          Sistema de Fichajes
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          Versión de prueba
        </Typography>
      </Box>

      {/* Menú de navegación */}
      <List sx={{ flex: 1, p: 2 }}>
        {/* Items principales */}
        {mainMenuItems.map(renderMenuItem)}

        <Divider sx={{ my: 1.5 }} />

        {/* ✅ Sección Vacaciones colapsable (como pide el mockup del sidebar) */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setVacationsOpen(!vacationsOpen)}
            sx={{ borderRadius: 2, '&:hover': { bgcolor: 'grey.100' } }}
          >
            <ListItemIcon sx={{ color: location.pathname.startsWith('/vacations') ? '#ff9a9e' : 'inherit', minWidth: 40 }}>
              <BeachIcon />
            </ListItemIcon>
            <ListItemText
              primary="Vacaciones"
              primaryTypographyProps={{
                fontWeight: location.pathname.startsWith('/vacations') ? 600 : 400,
                fontSize: '0.9rem'
              }}
            />
            {vacationsOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={vacationsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
            {vacationMenuItems.map(renderMenuItem)}
          </List>
        </Collapse>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Barra superior */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit" edge="start" onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* ✅ NUEVO: Buscador en topbar (como pide el mockup) */}
          <Box sx={{
            display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: 2, px: 1.5, py: 0.5, mr: 2, flex: { xs: 1, md: 'none' },
            minWidth: { md: 250 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
          }}>
            <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />
            <InputBase
              placeholder="Buscar…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ color: 'white', fontSize: '0.9rem', flex: 1,
                '& ::placeholder': { color: 'rgba(255,255,255,0.6)' }
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Notificaciones */}
          <IconButton color="inherit" sx={{ mr: 1 }} onClick={handleNotificationClick}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            PaperProps={{ sx: { mt: 1.5, maxWidth: 380, maxHeight: 400 } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight="600">Notificaciones</Typography>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">No hay notificaciones</Typography>
              </Box>
            ) : (
              notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => { handleNotificationClose(); navigate('/corrections'); }}
                  sx={{ whiteSpace: 'normal', py: 1.5 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="600">{notif.title}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {notif.message}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* Usuario */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography variant="body2" fontWeight="600">{user?.employeeName}</Typography>
            </Box>
            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                {user?.employeeName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}
              PaperProps={{ sx: { mt: 1.5, minWidth: 200 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" fontWeight="600">{user?.employeeName}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleClose}>
                <AccountCircle fontSize="small" sx={{ mr: 1 }} /> Mi Perfil
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Settings fontSize="small" sx={{ mr: 1 }} /> Configuración
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(0,0,0,0.08)' } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh' }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}