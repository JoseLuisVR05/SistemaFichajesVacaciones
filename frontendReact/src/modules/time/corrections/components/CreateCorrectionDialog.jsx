// CreateCorrectionDialog.jsx
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box
} from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const EMPTY_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  originalMinutes: '',
  correctedMinutes: '',
  reason: '',
};

export function CreateCorrectionDialog({ open, onClose, onSubmit, initialDate }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: initialDate || EMPTY_FORM.date,
  });
  const [saving, setSaving] = useState(false);

  // Traducción
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!form.reason.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        date: form.date,
        correctedMinutes: parseInt(form.correctedMinutes) || 0,
        reason: form.reason.trim(),
      });
      setForm(EMPTY_FORM);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('corrections.create.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('corrections.create.date')} type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            InputLabelProps={{ shrink: true }} fullWidth
          />
          <TextField
            label={t('corrections.create.originalMinutes')} type="number"
            value={form.originalMinutes}
            onChange={e => setForm(f => ({ ...f, originalMinutes: e.target.value }))}
            helperText={t('corrections.create.originalMinutesHelper')} fullWidth
          />
          <TextField
            label={t('corrections.create.correctedMinutes')} type="number"
            value={form.correctedMinutes}
            onChange={e => setForm(f => ({ ...f, correctedMinutes: e.target.value }))}
            helperText={t('corrections.create.correctedMinutesHelper')} fullWidth
          />
          <TextField
            label={t('corrections.create.reason')} value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            multiline rows={3} required
            placeholder={t('corrections.create.reasonPlaceholder')}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.reason.trim()}
        >
          {t('corrections.create.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}