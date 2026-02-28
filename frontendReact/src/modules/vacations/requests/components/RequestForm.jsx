// src/modules/vacations/requests/components/RequestForm.jsx
import {
  Box, Paper, Typography, TextField, MenuItem,
  Button, CircularProgress, Alert, Divider,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { Grid } from '@mui/material';

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
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>

      {/* ── Columna izquierda: formulario ── */}
      <Grid item xs={12} md={7} size={7}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom textAlign="center">
            Nueva solicitud
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Fecha inicio"
              type="date"
              value={form.startDate}
              onChange={e => onFormChange(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Fecha fin"
              type="date"
              value={form.endDate}
              onChange={e => onFormChange(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={e => onFormChange(prev => ({ ...prev, type: e.target.value }))}
              fullWidth
            >
              <MenuItem value="VACATION">Vacaciones</MenuItem>
              <MenuItem value="PERSONAL">Asuntos personales</MenuItem>
              <MenuItem value="OTHER">Otro</MenuItem>
            </TextField>
            <TextField
              label="Comentario (opcional)"
              value={form.comment}
              onChange={e => onFormChange(prev => ({ ...prev, comment: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              placeholder="Ej: Viaje familiar..."
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button
                variant="contained"
                onClick={onSubmit}
                disabled={!validation?.isValid || creating}
                startIcon={creating ? <CircularProgress size={16} /> : <Send />}
              >
                Enviar
              </Button>
              <Button
                variant="outlined"
                onClick={onSaveDraft}
                disabled={!validation?.isValid || creating}
              >
                Guardar borrador
              </Button>
              <Button onClick={onCancel}>
                Cancelar
              </Button>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* ── Columna derecha: cálculo automático ── */}
      <Grid item xs={12} md={5} size={5}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
          <Typography variant="subtitle2" fontWeight="600" gutterBottom>
            Cálculo automático
          </Typography>

          {validating && (
            <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />
          )}

          {!validation && !validating && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Selecciona las fechas para ver el cálculo.
            </Typography>
          )}

          {validation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Días laborables solicitados:</Typography>
                <Typography variant="body2" fontWeight="600">
                  {validation.workingDays}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Días disponibles:</Typography>
                <Typography variant="body2" fontWeight="600">
                  {validation.availableDays}
                </Typography>
              </Box>
              <Divider />
              {validation.isValid && (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Fechas válidas ✓
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