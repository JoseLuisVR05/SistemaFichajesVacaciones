// src/pages/dashboard/RecentActivity.jsx
import { Box, Paper, Typography, Chip, CircularProgress } from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../utils/helpers/dateUtils';

/**
 * RecentActivity
 * Muestra los últimos fichajes y las últimas solicitudes de vacaciones.
 *
 * @param {Array}   lastEntries   - Últimos fichajes del usuario
 * @param {Array}   lastRequests  - Últimas solicitudes de vacaciones
 * @param {boolean} loading       - Si está cargando
 */
export function RecentActivity({ lastEntries, lastRequests, loading }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>
        Actividad reciente
      </Typography>

      {/* Últimos fichajes */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Últimos fichajes
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : lastEntries.length > 0 ? (
        <Box>
          {lastEntries.map((entry) => (
            <Box
              key={entry.timeEntryId}
              sx={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
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
                  {format(toLocalDate(entry.eventTime), 'dd/MM HH:mm', { locale: es })}
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

      {/* Últimas solicitudes de vacaciones */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
        Últimas solicitudes de vacaciones
      </Typography>
      {lastRequests.length > 0 ? (
        <Box>
          {lastRequests.map((req) => (
            <Box
              key={req.requestId}
              sx={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Typography variant="body2">
                {req.startDate ? format(toLocalDate(req.startDate), 'dd/MM', { locale: es }) : ''} -{' '}
                {req.endDate   ? format(toLocalDate(req.endDate),   'dd/MM', { locale: es }) : ''}
              </Typography>
              <Chip
                label={req.status} size="small" variant="outlined"
                color={
                  req.status === 'APPROVED' ? 'success'
                  : req.status === 'REJECTED' ? 'error'
                  : 'default'
                }
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          Sin solicitudes
        </Typography>
      )}
    </Paper>
  );
}