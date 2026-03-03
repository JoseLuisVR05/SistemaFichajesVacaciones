// src/modules/vacations/requests/components/RequestForm.jsx
import {
  Box, Paper, Typography, TextField, MenuItem,
  Button, CircularProgress, Alert, Divider,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DateField } from '../../../../components/ui';

/**
 * RequestForm
 * Formulario de nueva solicitud de vacaciones + panel de cálculo automático.
 *
 * @param {object}   form          - Estado del formulario { startDate, endDate, type, comment }
 * @param {function} onFormChange  - Setter del formulario
 * @param {object}   validation    - Resultado de la validación de fechas
 * @param {boolean}  validating    - Si está calculando días
 * @param {boolean}  creating      - Si está guardando
 * @param {function} onSubmit      - Callback al pulsar "Enviar" (autoSubmit=true)
 * @param {function} onSaveDraft   - Callback al pulsar "Guardar borrador" (autoSubmit=false)
 * @param {function} onCancel      - Callback al pulsar "Cancelar"
 */

const isWekend = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

export function RequestForm({
  form,
  onFormChange,
  validation,
  validating,
  creating,
  onSubmit,
  onSaveDraft,
  onCancel,
}) {

  const { t } = useTranslation();

  // Si alguna de las fechas es fin de semaana, bloqueamos todo

  const startIsWeekend = isWekend(form.startDate);
  const endIsWeekend = isWekend(form.endDate);
  const hasWeekend = startIsWeekend || endIsWeekend;
  
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>

      {/* ── Columna izquierda: formulario ── */}
      <Grid item xs={12} md={7} size={7}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom textAlign="center">
            {t('vacations.form.title')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DateField
              label={t('vacations.form.startDate')}
              type="date"
              value={form.startDate}
              onChange={e => onFormChange(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <DateField
              label={t('vacations.form.endDate')}
              type="date"
              value={form.endDate}
              onChange={e => onFormChange(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label={t('vacations.form.type')}
              value={form.type}
              onChange={e => onFormChange(prev => ({ ...prev, type: e.target.value }))}
              fullWidth
            >
              <MenuItem value="VACATION">{t('vacations.form.types.vacation')}</MenuItem>
              <MenuItem value="PERSONAL">{t('vacations.form.types.personal')}</MenuItem>
              <MenuItem value="OTHER">{t('vacations.form.types.other')}</MenuItem>
            </TextField>
            <TextField
              label={t('vacations.form.comment')}
              value={form.comment}
              onChange={e => onFormChange(prev => ({ ...prev, comment: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              placeholder={t('vacations.form.commentPlaceholder')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button
                variant="contained"
                onClick={onSubmit}
                disabled={!validation?.isValid || creating || hasWeekend }
                startIcon={creating ? <CircularProgress size={16} /> : <Send />}
              >
                {t('vacations.form.submit')}
              </Button>
              <Button
                variant="outlined"
                onClick={onSaveDraft}
                disabled={!validation?.isValid || creating || hasWeekend}
              >
                {t('vacations.form.saveDraft')}
              </Button>
              <Button onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* ── Columna derecha: cálculo automático ── */}
      <Grid item xs={12} md={5} size={5}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
          <Typography variant="subtitle2" fontWeight="600" gutterBottom>
            {t('vacations.form.calculation.title')}
          </Typography>

          {validating && (
            <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />
          )}

          {!validation && !validating && !hasWeekend && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t('vacations.form.calculation.hint')}
            </Typography>
          )}

          {hasWeekend && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t('vacations.form.errors.weekendAlert')}
            </Alert>
          )}

          {validation && !hasWeekend && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{t('vacations.form.calculation.workingDays')}</Typography>
                <Typography variant="body2" fontWeight="600">
                  {validation.workingDays}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{t('vacations.form.calculation.availableDays')}</Typography>
                <Typography variant="body2" fontWeight="600">
                  {validation.availableDays}
                </Typography>
              </Box>
              <Divider />
              {validation.isValid && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  {t('vacations.form.calculation.valid')}
                </Alert>
              )}
              {validation.errors?.map((err, i) => (
                <Alert key={i} severity="error" sx={{ py: 0.5 }}>{err}</Alert>
              ))}
              {validation.warnings?.map((w, i) => (
                <Alert key={i} severity="warning" sx={{ py: 0.5 }}>{w}</Alert>
              ))}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}