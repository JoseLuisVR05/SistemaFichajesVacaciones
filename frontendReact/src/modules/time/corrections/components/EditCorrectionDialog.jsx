// EditCorrectionDialog.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Alert
} from '@mui/material';
import { toLocalDate } from '../.././../../utils/helpers/dateUtils';
import { format } from 'date-fns';

export function EditCorrectionDialog({ open, onClose, onSubmit, correction }) {
  const [form, setForm] = useState({ correctedMinutes: '', reason: '' });
  const [saving, setSaving] = useState(false);

  // Traducción
  const { t } = useTranslation();

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
    ? format(toLocalDate(correction.date), 'dd/MM/yyyy')
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('corrections.create.title')}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
           <strong>{dateFormatted}</strong>
        </Alert>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('corrections.edit.correctedMinutes')} type="number"
            value={form.correctedMinutes}
            onChange={e => setForm(f => ({ ...f, correctedMinutes: e.target.value }))}
            helperText={t('corrections.edit.correctedMinutesHelper')} fullWidth required
          />
          <TextField
            label={t('corrections.edit.reason')} value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            multiline rows={3} required fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.reason.trim()}
        >
          {t('corrections.edit.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}