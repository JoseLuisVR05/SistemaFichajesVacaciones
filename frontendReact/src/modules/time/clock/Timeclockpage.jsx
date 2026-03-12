import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon, Warning } from '@mui/icons-material';
import { registerEntry, getEntries, getDailySummary } from '../../../services/timeService';
import { getCorrections } from '../../../services/correctionsService';
import { useAuth } from '../../../context/AuthContext';
import { format, subDays, isWeekend } from 'date-fns';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { es, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mapEntryError } from '../../../utils/helpers/backendErrors';

export default function TimeClockPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'es' ? es : enUS;
  // Opción más clara y fácil de mantener
  const MISSING_OUT_API_TYPES = [
    'MISSING_OUT',
    'MISSING_OUT_ENTRY', 
    'MISSING_OUT_EXIT',
    'UNCLOSED_ENTRY'
  ];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastEntry, setLastEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [incident, setIncident] = useState(null);

  useEffect(() => {
    loadLastEntry();
    checkYesterdayIncident(i18n.language);
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
    }
  };
  // ── Req #4: detectar incidencia del día anterior ──────────────────────
  const checkYesterdayIncident = async (language ='en') => {
    try {

      const currentLocale = language === 'es' ? es : enUS;
      const datePattern   = language === 'es' ? "EEEE d 'de' MMMM" : "EEEE, MMMM d";

      const yesterday = subDays(new Date(), 1);
      if (isWeekend(yesterday)) return;

      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      const summaries = await getDailySummary({ from: yesterdayStr, to: yesterdayStr });
      const summary = summaries?.[0];

      if (!summary) return;

      const workedH = summary?.workedHours ?? 0;
      const expectedH = summary?.expectedHours ?? 0;
      const balanceH = summary?.balanceHours ?? 0;
      const apiIncidentType = summary?.incidentType ?? null;
      const proposedMinutes = summary?.proposedCorrectionsMinutes ?? 0;

      if (expectedH === 0) return;
  
      // Determinar tipo de incidencia
      let incidentType = null;

      if (apiIncidentType === 'NO_ENTRIES') {
        incidentType = 'missing';
      } else if (apiIncidentType === 'UNCLOSED_ENTRY') {
        incidentType = 'missing_out';
      } else if (['MISSING_OUT', 'MISSING_OUT_ENTRY', 'MISSING_OUT_EXIT'].includes(apiIncidentType)) {
        incidentType = 'missing_out';
      } else if (apiIncidentType === 'INCOMPLETE') {
        incidentType = 'incomplete';
      } else if (balanceH < -0.25) {
        incidentType = 'incomplete';
      } else if (workedH === 0) {
        incidentType = 'missing';
      } 

      if (!incidentType) return;

      const corrections = await getCorrections({ includeOwn: true, from: yesterdayStr, to: yesterdayStr });
      const alreadyHandled = (corrections || []).some(c => c.date?.startsWith(yesterdayStr));

      if (alreadyHandled) return;

      // Crear incidencia
      const incidentData = {
        date: yesterdayStr,
        dateFormatted: format(yesterday, datePattern, { locale: currentLocale }),
        type: incidentType,
        apiIncidentType,
        workedHours: workedH,
        expectedHours: expectedH,
        deficitHours: Math.abs(balanceH).toFixed(1),
        proposedMinutes
      };

      setIncident(incidentData);
      
    } catch (error) {
    }
  };

  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      await registerEntry(type);
      setMessage(t(`timeclock.entryRegistered.${type}`));
      
      setTimeout(() => {
        loadLastEntry();
        setMessage('');
      }, 2000);
    } catch (err) {
      const backendMessage = err.response?.data?.message || '';
      setMessage(mapEntryError(backendMessage, t));
    } finally {
      setLoading(false);
    }
  };

  const renderIncidentMessage = () => {
    if (!incident) return null;

    if (incident.type === 'missing') {
      return (
        <span dangerouslySetInnerHTML={{ __html:
          t('timeclock.incident.missing', { date: incident.dateFormatted })
        }} />
      );
    }

    if (incident.type === 'missing_out') {
      return (
        <span dangerouslySetInnerHTML={{ __html:
          t('timeclock.incident.missing_out', { date: incident.dateFormatted })
        }} />
      );
    }

    // 'incomplete': fichó entrada y salida pero con menos horas de las esperadas
    return (
      <span dangerouslySetInnerHTML={{ __html:
        t('timeclock.incident.incomplete', {
          date: incident.dateFormatted,
          worked: incident.workedHours,
          expected: incident.expectedHours,
          deficit: incident.deficitHours
        })
      }} />
    );
  };

  return (
    <Box>
      <Box sx={{ mb:4, textAlign:"center"}}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        {t('timeclock.title')}
      </Typography>
       </Box>

      {/* Tarjeta de estado */}
      <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('timeclock.statusCard')}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">{t('timeclock.employee')}</Typography>
            <Typography variant="h6" fontWeight="600">{user?.employeeName}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">{t('timeclock.date')}</Typography>
            <Typography variant="h6" fontWeight="600">
              {format(currentTime, "dd/MM/yyyy", { locale: currentLocale })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">{t('timeclock.time')}</Typography>
            <Typography variant="h6" fontWeight="600" color="primary">
              {format(currentTime, "HH:mm:ss", { locale: currentLocale })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">{t('timeclock.lastEntry')}</Typography>
            <Typography variant="h6" fontWeight="600">
              {lastEntry 
                ? `${lastEntry.entryType} - ${format(toLocalDate(lastEntry.time), "HH:mm", { locale: currentLocale })}`
                : t('timeclock.noEntries')
              }
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Acción principal */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          {t('timeclock.mainAction')}
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
            {t('timeclock.clockIn')}
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
            {t('timeclock.clockOut')}
          </Button>
        </Box>
      </Paper>

      {/* Mensajes */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          {t('timeclock.messages')}
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
                state: { 
                  openNew: true, 
                  date: incident.date,
                  proposedMinutes: incident.proposedMinutes,
                  incidentType: incident.apiIncidentType
                 }
              })}
            >
              {t('timeclock.incident.requestCorrection')}
            </Button>
          }
          onClose={() => setIncident(null)}
        >
          {renderIncidentMessage()}
        </Alert>
      )}
      </Paper>
    </Box>
  );
}