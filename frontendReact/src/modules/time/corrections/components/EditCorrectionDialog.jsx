// EditCorrectionDialog.jsx
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Alert
} from '@mui/material';

export function EditCorrectionDialog({ open, onClose, onSubmit, correction }) {
  const [form, setForm] = useState({ correctedMinutes: '', reason: '' });
  const [saving, setSaving] = useState(false);

  // Sincronizar form cuando cambia la corrección seleccionada
  useEffect(() => {
    if (correction) {
      setForm({
        correctedMinutes: correction.correctedMinutes ?? '',
        reason: correction.reason ?? '',
      });
    }
  }, [correction]);

  const handleSubmit = async () => {
    if (!form.reason.trim()) return;
    setSaving(true);
    try {
      await onSubmit(correction.id, {
        correctedMinutes: parseInt(form.correctedMinutes),
        reason: form.reason.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const dateFormatted = correction?.date
    ? new Date(correction.date).toLocaleDateString('es-ES')
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar solicitud de corrección</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          Editando la corrección del <strong>{dateFormatted}</strong>
        </Alert>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Minutos corregidos (reales)" type="number"
            value={form.correctedMinutes}
            onChange={e => setForm(f => ({ ...f, correctedMinutes: e.target.value }))}
            helperText="Minutos que deberían figurar" fullWidth required
          />
          <TextField
            label="Motivo actualizado" value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            multiline rows={3} required fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.reason.trim()}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}