// src/components/ui/LoadingSpinner/LoadingSpinner.jsx
import { Box, CircularProgress } from '@mui/material';

/**
 * LoadingSpinner
 *
 * Spinner centrado en su contenedor. Reemplaza el patrón:
 * <Box display="flex" justifyContent="center" alignItems="center" height="100%">
 *   <CircularProgress />
 * </Box>
 *
 * @param {'100%'|string} height - Alto del contenedor (default: '100%')
 * @param {number} size          - Tamaño del spinner en px (default: 40)
 *
 * @example
 * {loading ? <LoadingSpinner /> : <DataGrid ... />}
 * {loading ? <LoadingSpinner height="300px" /> : <content />}
 */
export function LoadingSpinner({ height = '100%', size = 40 }) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height={height}
    >
      <CircularProgress size={size} />
    </Box>
  );
}