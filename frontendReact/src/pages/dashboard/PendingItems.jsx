// src/pages/dashboard/PendingItems.jsx
import { Box, Paper, Typography, Chip } from '@mui/material';

/**
 * PendingItems
 * Tarjeta que muestra contadores de pendientes del usuario.
 *
 * @param {number} pendingCorrections  - Correcciones pendientes propias
 * @param {number} pendingApprovals    - Solicitudes de vacaciones pendientes
 */
export function PendingItems({ pendingCorrections, pendingApprovals }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight="600" gutterBottom>
        Pendientes
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2">
            • Mis correcciones pendientes
          </Typography>
          <Chip
            label={pendingCorrections}
            color={pendingCorrections > 0 ? 'warning' : 'default'}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2">
            • Mis aprobaciones de vacaciones pendientes
          </Typography>
          <Chip
            label={pendingApprovals}
            color={pendingApprovals > 0 ? 'info' : 'default'}
            size="small"
          />
        </Box>
      </Box>
    </Paper>
  );
}