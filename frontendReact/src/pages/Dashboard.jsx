import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper, Grid, Card, CardContent, Chip } from '@mui/material';
import { AccessTime, CheckCircle, Cancel, TrendingUp } from '@mui/icons-material';
import { getDailySummary, getEntries, registerEntry } from '../services/timeService';
import { useAuth } from '../context/AuthContext';
import{ format, set } from 'date-fns';
import {es} from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastEntries, setLastEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try{
      setLoadingData(true);

      //Cargar ultimos 4 fichajes
      const entries = await getEntries();
      setLastEntries(entries.slice(0,4));

      //Resumen del dia actual
      const today = new Date();
      const summaryData = await getDailySummary({
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      });
      
      if(summaryData && summaryData.length > 0){
        setSummary(summaryData[0]);
      }
    } catch (err){
      console.error('Error cargando datos:', err);
    }finally{
        setLoadingData(false);
    }
  };

  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await registerEntry(type);
      setMessage(result.message || `Fichaje ${type} registrado con éxito`);

      setTimeout(() => {
        loadDashboardData();
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb:4 }}>
        {/* Saludo y fecha actual */}
        <Typography variant="h4" gutterBottom>
          Bienvenido, {user?.employeeName}
        </Typography>
        <Typography variant ="body1" color="text.secondary">
          {format(new Date(), "eeee, d 'de' MMMM 'de' yyyy", {locale: es})}
        </Typography>
      </Box>

        {message && ( 
          <Alert 
          severity={message.includes('Error') ? 'error' : 'success'} 
          sx={{ mb: 3 }}
          onClose={()=>setMessage("")}
          >
          {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Botones de entrada/salida */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, textAlign:'center' }}>
              <Typography variant="h6" gutterBottom>
                Registrar Fichaje
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="large" 
                  onClick={() => handleEntry('IN')} 
                  disabled={loading}
                  sx={{
                    minWidth: 150,
                    minHeight: 80,
                    fontSize: '1.2rem',
                    flexDirection: 'column',
                    gap: 1
                  }}
                  startIcon={loading ? <CircularProgress size={24} /> : <CheckCircle />}
                >
                  ENTRADA
                </Button>
                <Button
                  variant="contained" 
                  color="error" 
                  size="large" 
                  onClick={() => handleEntry('OUT')} 
                  disabled={loading}
                  sx={{
                    minWidth: 150,
                    minHeight: 80,
                    fontSize: '1.2rem',
                    flexDirection: 'column',
                    gap: 1
                  }}
                  startIcon={loading ? <CircularProgress size={24} /> : <CheckCircle />}
                >
                  SALIDA
                </Button>
              </Box>
          </Paper>
        </Grid>

        {/* Resumen diario */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumen del día
            </Typography>
            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : summary ?(
              <Box sx={{ mt:2 }}>
                <Box sx={{ display: 'flex', justifyContent: "space-between", mb:2 }}>
                  <Typography variant="body2" color='text.secondary'>
                  Horas trabajadas
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {summary.workedHours}h
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: "space-between", mb:2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Horas esperadas
                  </Typography>
                  <Typography variant="body1">
                    {summary.expectedHours}h
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Balance de horas
                  </Typography>  
                  <Typography 
                    variant="h6" 
                    color={summary.balanceHours >=0 ? 'success.main' : 'error.main'}>
                    {summary.balanceHours > 0 ? '+' : ''}{summary.balanceHours}h
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                No hay fichajes registrados hoy.
              </Typography>
            )}
          </Paper>
        </Grid>
        {/* Últimos fichajes */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Últimos fichajes
            </Typography>
            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : lastEntries.length > 0 ? (
              <Box sx={{ mt:2 }}>
                {lastEntries.map((entry) => (
                  <Box
                    key ={entry.timeEntryId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '$:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={entry.type}
                        color={entry.type === 'IN' ? 'success' : 'error'}
                        size="small"
                      />
                      <Typography variant="body1">
                      {format(new Date(entry.eventTime), "dd/MM/yyyy HH:mm:ss", {locale: es})}
                      </Typography>
                    </Box>
                    <Chip
                      label={entry.source}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
               No hay fichajes registrados.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}