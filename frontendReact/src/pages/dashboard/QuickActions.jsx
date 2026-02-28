// src/pages/dashboard/QuickActions.jsx
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';

/**
 * QuickActions
 * Botones de entrada, salida y solicitar vacaciones.
 *
 * @param {boolean}  loading      - Si hay un fichaje en curso
 * @param {function} onEntry      - Callback al fichar (recibe 'IN' o 'OUT')
 * @param {function} onVacations  - Callback al pulsar "Solicitar vacaciones"
 */
export function QuickActions({ loading, onEntry, onVacations }) {
  return (
    <Paper sx={{ p: 3, height: '92%' }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>
        Acciones rápidas
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Button
          fullWidth variant="contained" color="success" size="large"
          onClick={() => onEntry('IN')} disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
          sx={{ mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
        >
          Fichar Entrada
        </Button>
        <Button
          fullWidth variant="contained" color="error" size="large"
          onClick={() => onEntry('OUT')} disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <LogoutIcon />}
          sx={{ mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
        >
          Fichar Salida
        </Button>
        <Button
          fullWidth variant="outlined" size="large"
          onClick={onVacations}
          sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
        >
          Solicitar vacaciones
        </Button>
      </Box>
    </Paper>
  );
}