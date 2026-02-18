import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { registerEntry, getEntries } from '../../../services/timeService';
import { useAuth } from '../../../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TimeClockPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastEntry, setLastEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadLastEntry();
    // Actualizar hora cada segundo
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadLastEntry = async () => {
    try {
      const entries = await getEntries();
      if (entries && entries.length > 0) {
        setLastEntry(entries[0]);
      }
    } catch (err) {
      console.error('Error cargando último fichaje:', err);
    }
  };

  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await registerEntry(type);
      setMessage(result.message || `Fichaje de ${type === 'IN' ? 'entrada' : 'salida'} registrado correctamente`);
      
      setTimeout(() => {
        loadLastEntry();
        setMessage('');
      }, 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al registrar fichaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
        sx={{width: '75vw', height: '100vh'}}
    >
      <Box sx={{ mb:4, textAlign:"center"}}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Registro de fichaje
      </Typography>
       </Box>

      {/* Tarjeta de estado */}
      <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Tarjeta de estado
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Empleado</Typography>
            <Typography variant="h6" fontWeight="600">{user?.employeeName}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Fecha</Typography>
            <Typography variant="h6" fontWeight="600">
              {format(currentTime, "dd/MM/yyyy", { locale: es })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Hora</Typography>
            <Typography variant="h6" fontWeight="600" color="primary">
              {format(currentTime, "HH:mm:ss", { locale: es })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Último fichaje</Typography>
            <Typography variant="h6" fontWeight="600">
              {lastEntry 
                ? `${lastEntry.entryType} - ${format(new Date(lastEntry.eventTime), "HH:mm", { locale: es })}`
                : 'Sin fichajes hoy'
              }
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Acción principal */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Acción principal
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, mt: 4 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={() => handleEntry('IN')}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            sx={{
              minWidth: 200,
              py: 3,
              fontSize: '1.2rem',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}
          >
            ENTRADA
          </Button>
          
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={() => handleEntry('OUT')}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
            sx={{
              minWidth: 200,
              py: 3,
              fontSize: '1.2rem',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}
          >
            SALIDA
          </Button>
        </Box>
      </Paper>

      {/* Mensajes */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Mensajes
        </Typography>
          {message && (
          <Alert 
            severity={message.includes('Error') ? 'error' : 'success'} 
            sx={{ mb: 3, mt: 2 }}
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}