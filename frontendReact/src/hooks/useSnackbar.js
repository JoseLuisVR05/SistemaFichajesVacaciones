// src/hooks/useSnackbar.js
import { useState, useCallback } from 'react';

/**
 * useSnackbar
 *
 * Encapsula el estado y la lógica del Snackbar de MUI.
 * Evita repetir el mismo useState + showSnack en cada componente.
 *
 * Uso:
 *   const { snackbar, showSnack, closeSnack } = useSnackbar();
 *   <SnackbarAlert {...snackbar} onClose={closeSnack} />
 */
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnack = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnack = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return { snackbar, showSnack, closeSnack };
}