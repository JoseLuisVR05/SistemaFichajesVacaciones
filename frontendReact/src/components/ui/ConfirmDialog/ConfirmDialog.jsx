// src/components/ui/ConfirmDialog/ConfirmDialog.jsx
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, CircularProgress
} from '@mui/material';

/**
 * ConfirmDialog
 *
 * Dialog genérico de confirmación. Reemplaza los dialogs de "¿Seguro que...?"
 * que se repetían en Corrections, AdminPanel, VacationApprovals, etc.
 *
 * @param {boolean} open          - Si el dialog está visible
 * @param {function} onClose      - Callback al cerrar/cancelar
 * @param {function} onConfirm    - Callback al confirmar
 * @param {string} title          - Título del dialog
 * @param {string} description    - Texto descriptivo
 * @param {string} confirmLabel   - Texto del botón confirmar (default: 'Confirmar')
 * @param {'primary'|'error'|'warning'} confirmColor - Color del botón (default: 'primary')
 * @param {boolean} loading       - Muestra spinner en el botón (default: false)
 *
 * @example
 * <ConfirmDialog
 *   open={deleteOpen}
 *   onClose={() => setDeleteOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Eliminar política"
 *   description="¿Seguro que deseas eliminar esta política? No podrá recuperarse."
 *   confirmLabel="Eliminar"
 *   confirmColor="error"
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmColor = 'primary',
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{description}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}