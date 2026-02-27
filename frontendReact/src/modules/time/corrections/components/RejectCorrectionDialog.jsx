// RejectCorrectionDialog.jsx
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography
} from '@mui/material';

export function RejectCorrectionDialog({ open, onClose, onSubmit, correction }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onSubmit(correction.id, reason.trim());
      setReason('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const dateFormatted = correction?.date
    ? new Date(correction.date).toLocaleDateString('es-ES')
    : '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rechazar corrección</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2, mt: 1 }}>
          Indica el motivo del rechazo para la corrección del{' '}
          <strong>{dateFormatted}</strong>:
        </Typography>
        <TextField
          label="Motivo del rechazo" value={reason}
          onChange={e => setReason(e.target.value)}
          multiline rows={3} required fullWidth autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained" color="error"
          onClick={handleSubmit}
          disabled={saving || !reason.trim()}
        >
          Confirmar rechazo
        </Button>
      </DialogActions>
    </Dialog>
  );
}