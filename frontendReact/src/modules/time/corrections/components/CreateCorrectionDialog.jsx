// CreateCorrectionDialog.jsx
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Alert, CircularProgress
} from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { DateField } from '../../../../components/ui';
import { getDailySummary } from '../../../../services/timeService';


const EMPTY_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  deltaMinutes: '',
  reason: '',
};

export function CreateCorrectionDialog({ open, onClose, onSubmit, initialDate }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: initialDate || EMPTY_FORM.date,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState(null);
  const [error, setError] = useState(null);

  // Traducción
  const { t } = useTranslation();

  // Cargar resumen del día cuando cambia la fecha
  useEffect(() => {
    if (!open) return;

    const loadDailySummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // getDailySummary retorna array, obtenemos el primer elemento (el día especificado)
        const summaries = await getDailySummary({ 
          from: form.date, 
          to: form.date 
        });
        
        if (summaries && summaries.length > 0) {
          // Convertir horas a minutos porque el formulario trabaja con minutos
          const summary = summaries[0];
          setDailySummary({
            workedMinutes: Math.round(summary.workedHours * 60),
            expectedMinutes: Math.round(summary.expectedHours * 60),
            balanceMinutes: Math.round(summary.balanceHours * 60),
            incidentType: summary.incidentType,
            hasOpenEntry: summary.hasOpenEntry
          });
        } else {
          setError(t('corrections.create.noDataForDate'));
          setDailySummary(null);
        }
      } catch (err) {
        setError(t('errors.loadingSummary') || 'Error cargando resumen del día');
        setDailySummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadDailySummary();
  }, [form.date, open, t]);

  useEffect(() => {
    if (open && initialDate) {
      setForm(f => ({ ...f, date: initialDate }));
    }
  }, [open, initialDate]);

  const handleSubmit = async () => {
    if (!form.reason.trim()) return;
    if (!dailySummary) return;

    setSaving(true);
    try {
      // Calcular correctedMinutes = originalMinutes + deltaMinutes
      const deltaMinutes = parseInt(form.deltaMinutes) || 0;
      const correctedMinutes = dailySummary.workedMinutes + deltaMinutes;

      await onSubmit({
        date: form.date,
        correctedMinutes: correctedMinutes,
        reason: form.reason.trim(),
      });
      setForm(EMPTY_FORM);
      setDailySummary(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };


  const handleClose = () => {
    setForm(EMPTY_FORM);
    setDailySummary(null);
    setError(null);
    onClose();
  };

  // Convertir minutos a formato HH:MM
  const formatMinutes = (minutes) => {
    if (!minutes && minutes !== 0) return '--:--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('corrections.create.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <DateField
            label={t('corrections.create.date')} 
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            fullWidth
          />

          {/* Mostrar resumen del día */}
          {loading && <CircularProgress size={24} />}
          {error && <Alert severity="error">{error}</Alert>}
          {dailySummary && !loading && (
            <Alert severity="info">
              📊 {t('corrections.create.daySummary')}: 
              {formatMinutes(dailySummary.workedMinutes)} {t('common.worked')} 
              / {formatMinutes(dailySummary.expectedMinutes)} {t('common.expected')}
            </Alert>
          )}

          <TextField
            label={t('corrections.create.deltaMinutes')} 
            type="number"
            value={form.deltaMinutes}
            onChange={e => setForm(f => ({ ...f, deltaMinutes: e.target.value }))}
            helperText={t('corrections.create.deltaMinutesHelper')}
            fullWidth
            disabled={!dailySummary || loading}
          />
          <TextField
            label={t('corrections.create.reason')} 
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            multiline 
            rows={3} 
            required
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
          disabled={saving || !form.reason.trim() || !dailySummary || loading}
        >
          {saving ? <CircularProgress size={20} /> : t('corrections.create.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}