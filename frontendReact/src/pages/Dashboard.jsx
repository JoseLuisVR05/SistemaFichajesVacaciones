import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper, Grid, Chip, Card, CardContent } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { getDailySummary, getEntries, registerEntry } from '../services/timeService';
import { getCorrections } from '../services/correctionsService';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getBalance } from '../services/vacationsService;'

export default function Dashboard() {
  const { user } = useAuth();
  const [ loading, setLoading ] = useState(false);
  const [ message, setMessage ] = useState('');
  const [ lastEntries, setLastEntries ] = useState([]);
  const [ todaySummary, setTodaySummary ] = useState(null);
  const [ weekBalance, setWeekBalance ] = useState(null);
  const [ loadingData, setLoadingData ] = useState(true);
  const [ pendingCorrections, setPendingCorrections] = useState(0);
  const [vacationBalance, setVacationBalance] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      
      const entries = await getEntries();
      setLastEntries(entries.slice(0, 5));

      const today = new Date().toISOString().split('T')[0];
      const summaryData = await getDailySummary({ from: today, to: today });
      
      if (summaryData && summaryData.length > 0) {
        setTodaySummary(summaryData[0]);
      }

      //Calcular balance semanal
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek -1;
      const monday = new Date(now);

      monday.setDate(now.getDate() - diffToMonday);

      const mondayStr = monday.toISOString().split('T')[0];

      const weekData = await getDailySummary({from: mondayStr, to: today});
      if( weekData && weekData.length > 0){
        const totalBalance = weekData.reduce(( acc, day ) => acc +(day.balanceHours || 0), 0);
        setWeekBalance(Math.round(totalBalance * 100) /100);
      }
      try{
        const corrections = await getCorrections({status: 'PENDING'});
        setPendingCorrections(Array.isArray(corrections)?corrections.length: 0);
      }catch{
        setPendingCorrections(0);
      }
      try {
        const balance = await getBalance();
        // Actualizar estado con los días restantes
        setVacationBalance(balance);
      } catch {
        setVacationBalance(null);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await registerEntry(type);
      setMessage(result.message || `Fichaje ${type} registrado correctamente`);
      
      setTimeout(() => {
        loadDashboardData();
        setMessage('');
      }, 1000);
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
      {/* Saludo y fecha actual */}
      <Box sx={{ mb:4, textAlign:"center", ml:20}}>              
        <Typography variant="h4" fontWeight="600" gutterBottom>
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
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {/* Tarjetas superiores */}
      <Grid container spacing={2} sx={{ mb: 3 }} >
        {/* Horas hoy */}
        <Grid item xs={12} sm={4} size={4} >
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Horas hoy
              </Typography>
              {loadingData ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h4" fontWeight="600">
                  {todaySummary?.workedHours || 0}h
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Balance semana */}
        <Grid item xs={12} sm={4} size={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Balance semana
              </Typography>
              {loadingData?(
                <CircularProgress size={24}/>
              ):(
                <Typography 
                variant="h4" 
                fontWeight="600"
                color={weekBalance !== null && weekBalance < 0 ? 'error.main':'success.main'}
                >
                {weekBalance !== null ? `${weekBalance >= 0 ? '+':''}${weekBalance}h`:'0h'}
              </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Vacaciones restantes */}
        <Grid item xs={12} sm={4} size={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="600">
                {vacationBalance ? `${vacationBalance.remainingDays}` : '--'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {vacationBalance ? `de ${vacationBalance.allocatedDays} asignados` : 'Sin política asignada'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} >
        {/* Columna izquierda - Acciones rápidas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '92%' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Acciones rápidas
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                onClick={() => handleEntry('IN')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{ mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Fichar Entrada
              </Button>
              
              <Button
                fullWidth
                variant="contained"
                color="error"
                size="large"
                onClick={() => handleEntry('OUT')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LogoutIcon />}
                sx={{ mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Fichar Salida
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                disabled
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Solicitar vacaciones
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Columna derecha */}
        <Grid item xs={12} md={6} size={5.7}>
          {/* Pendientes */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Pendientes
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx = {{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
              <Typography variant="body2">
                • Correcciones Pendientes
              </Typography>
              <Chip
              label = {pendingCorrections}
              color = {pendingCorrections > 0 ? 'warning':'default'}
              size = "small"
              />
              </Box>
            </Box>
          </Paper>

          {/* Actividad reciente */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Actividad reciente
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Últimos fichajes
            </Typography>
            
            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : lastEntries.length > 0 ? (
              <Box>
                {lastEntries.map((entry) => (
                  <Box
                    key={entry.timeEntryId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={entry.entryType}
                        color={entry.entryType === 'IN' ? 'success' : 'error'}
                        size="small"
                        sx={{ minWidth: 50 }}
                      />
                      <Typography variant="body2">
                        {format(new Date(entry.eventTime), "dd/MM HH:mm", { locale: es })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                No hay fichajes recientes
              </Typography>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Últimas solicitudes
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              Sin solicitudes
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

  