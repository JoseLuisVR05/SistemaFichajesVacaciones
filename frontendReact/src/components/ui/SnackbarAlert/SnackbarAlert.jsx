// src/components/ui/SnackbarAlert/SnackbarAlert.jsx
import { Snackbar, Alert } from '@mui/material';

/**
 * SnackbarAlert
 *
 * Wrapper del Snackbar + Alert de MUI.
 * Úsalo junto a useSnackbar para no repetir JSX en cada página.
 *
 * Uso:
 *   <SnackbarAlert
 *     open={snackbar.open}
 *     message={snackbar.message}
 *     severity={snackbar.severity}
 *     onClose={closeSnack}
 *   />
 */
export function SnackbarAlert({ open, message, severity = 'success', onClose }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={severity} variant="filled" onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}