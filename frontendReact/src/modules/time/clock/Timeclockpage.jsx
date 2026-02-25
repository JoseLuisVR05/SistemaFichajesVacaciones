import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon, Warning } from '@mui/icons-material';
import { registerEntry, getEntries, getDailySummary } from '../../../services/timeService';
import { getCorrections } from '../../../services/correctionsService';
import { useAuth } from '../../../context/AuthContext';
import { format, subDays, isWeekend } from 'date-fns';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function TimeClockPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastEntry, setLastEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [incident, setIncident] = useState(null);

  useEffect(() => {
    loadLastEntry();
    checkYesterdayIncident();
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
  // ── Req #4: detectar incidencia del día anterior ──────────────────────
  const checkYesterdayIncident = async () => {
    try {
      const yesterday = subDays(new Date(), 1);

      // Solo comprobar días laborables (lun-vie)
      if (isWeekend(yesterday)) return;

      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      // 1. Obtener resumen del día anterior
      const summaries = await getDailySummary({ from: yesterdayStr, to: yesterdayStr });
      const summary = summaries?.[0];

      const workedH = summary?.workedHours ?? 0;
      const expectedH = summary?.expectedHours ?? 0;  
      const balanceH = summary?.balanceHours ?? 0;

      // Si expectedHours === 0 el empleado no tiene horario configurado ese día:
      // no hay nada que comprobar, salir sin incidencia.
      if (expectedH === 0) return;
      // Determinar tipo de incidencia:
      // 'missing'    → ningún fichaje registrado en todo el día
      // 'incomplete' → fichajes registrados pero no alcanzó las horas esperadas
      // Tolerancia de 0.25h (15 min) para evitar falsas alertas por redondeos.
      let incidentType = null;

      if (workedH === 0) {
        incidentType = 'missing';
      } else if (balanceH < -0.25) {
        incidentType = 'incomplete';
      }
      
      if (!incidentType) return; // No hay incidencia

      // 2. Verificar que no exista ya una corrección para esa fecha (evita mostrar la incidencia si ya la gestionó)
      const corrections = await getCorrections({ includeOwn: true, from: yesterdayStr, to: yesterdayStr });
      const alreadyHandled = (corrections || []).some(c =>
        c.date?.startsWith(yesterdayStr)
      );

      if (alreadyHandled) return; 
        setIncident({
          date: yesterdayStr,
          dateFormatted: format(yesterday, "EEEE d 'de' MMMM", { locale: es }),
          type: incidentType,
          workedHours: workedH,
          expectedHours: expectedH,
          deficitHours: Math.abs(balanceH).toFixed(1)
        });
    } catch {/* No hacer nada en caso de error, simplemente no mostrar la incidencia */}
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
                ? `${lastEntry.entryType} - ${format(toLocalDate(lastEntry.eventTime), "HH:mm", { locale: es })}`
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
        {/* ── Req #4: Banner de incidencia ─────────────────────────────── */}
         {incident && (
        <Alert
          severity="warning"
          icon={<Warning />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={() => navigate('/corrections', {
                state: { openNew: true, date: incident.date }
              })}
            >
              Crear corrección
            </Button>
          }
          onClose={() => setIncident(null)}
        >
          {incident.type === 'missing' ? (
            <>
              <strong>Incidencia detectada:</strong> El {incident.dateFormatted} no se registró
              ningún fichaje. Si fue un error, puedes solicitar una corrección.
            </>
          ) : (
            <>
              <strong>Jornada incompleta:</strong> El {incident.dateFormatted} se registraron{' '}
              <strong>{incident.workedHours}h</strong> de las{' '}
              <strong>{incident.expectedHours}h</strong> esperadas
              {incident.deficitHours && ` (faltan ${incident.deficitHours}h)`}.
              Si fue un error de fichaje, puedes solicitar una corrección.
            </>
          )}
        </Alert>
      )}
      </Paper>
    </Box>
  );
}