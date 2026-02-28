// src/pages/Dashboard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Alert, CircularProgress,
  Card, CardContent, Grid,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { registerEntry } from '../services/timeService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Subcomponentes ────────────────────────────────────────────────────────
import { QuickActions }  from './dashboard/QuickActions';
import { PendingItems }  from './dashboard/PendingItems';
import { RecentActivity } from './dashboard/RecentActivity';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Hook de datos ──────────────────────────────────────
  const {
    lastEntries, todaySummary, weekBalance,
    loadingData, pendingCorrections, pendingApprovals,
    vacationBalance, lastRequests, loadDashboardData,
  } = useDashboard();

  // ── Estado de UI ───────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ── Fichaje ────────────────────────────────────────────
  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await registerEntry(type);
      setMessage(result.message || `Fichaje ${type} registrado correctamente`);
      setTimeout(() => { loadDashboardData(); setMessage(''); }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al registrar fichaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Saludo */}
      <Box sx={{ mb: 4, textAlign: 'center', ml: 20 }}>
        <Typography variant="h4" fontWeight="600" gutterBottom>
          Bienvenido, {user?.employeeName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {format(new Date(), "eeee, d 'de' MMMM 'de' yyyy", { locale: es })}
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

      {/* Tarjetas de métricas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Horas hoy',
            value: loadingData ? null : `${todaySummary?.workedHours || 0}h`,
          },
          {
            label: 'Balance semana',
            value: loadingData ? null : (
              weekBalance !== null
                ? `${weekBalance >= 0 ? '+' : ''}${weekBalance}h`
                : '0h'
            ),
            color: weekBalance !== null && weekBalance < 0
              ? 'error.main'
              : 'success.main',
          },
          {
            label: 'Vacaciones restantes',
            value: loadingData ? null : (
              vacationBalance ? `${vacationBalance.remainingDays} días` : '--'
            ),
          },
        ].map(({ label, value, color }) => (
          <Grid item xs={12} sm={4} size={4} key={label}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {label}
                </Typography>
                {loadingData
                  ? <CircularProgress size={24} />
                  : <Typography variant="h4" fontWeight="600" color={color}>
                      {value}
                    </Typography>
                }
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Contenido principal */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <QuickActions
            loading={loading}
            onEntry={handleEntry}
            onVacations={() => navigate('/vacations/requests')}
          />
        </Grid>

        <Grid item xs={12} md={6} size={5.7}>
          <PendingItems
            pendingCorrections={pendingCorrections}
            pendingApprovals={pendingApprovals}
          />
          <RecentActivity
            lastEntries={lastEntries}
            lastRequests={lastRequests}
            loading={loadingData}
          />
        </Grid>
      </Grid>
    </Box>
  );
}