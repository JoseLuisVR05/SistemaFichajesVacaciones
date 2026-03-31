import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from '@mui/material';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DEFAULT_TEMPLATE = {
  name: '',
  description: '',
  isDefault: false,
  dayDetails: Array(7)
    .fill(null)
    .map((_, i) => ({
      dayOfWeek: i,
      isWorkDay: i < 5,
      expectedStartTime: '09:00',
      expectedEndTime: '18:00',
      breakMinutes: 30,
    })),
};

export function CalendarTemplateForm({
  open,
  onClose,
  onSave,
  editingTemplate = null,
  loading = false,
}) {
  const [form, setForm] = useState(DEFAULT_TEMPLATE);
  const [isNew, setIsNew] = useState(true);

  // Cuando se abre con template a editar
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setForm({
          ...editingTemplate,
          dayDetails: editingTemplate.dayDetails || DEFAULT_TEMPLATE.dayDetails,
        });
        setIsNew(false);
      } else {
        setForm(DEFAULT_TEMPLATE);
        setIsNew(true);
      }
    }
  }, [open, editingTemplate]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDayChange = (dayIndex, field, value) => {
    const updated = [...form.dayDetails];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    setForm((prev) => ({ ...prev, dayDetails: updated }));
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      alert('Ingresa un nombre para la plantilla');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isNew ? '➕ Crear Nueva Plantilla' : '✏️ Editar Plantilla'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* Campos básicos */}
          <TextField
            label="Nombre de la plantilla"
            value={form.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            fullWidth
            size="small"
            placeholder="ej: Horario Estándar 9-18"
          />

          <TextField
            label="Descripción (opcional)"
            value={form.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.isDefault}
                onChange={(e) =>
                  handleFormChange('isDefault', e.target.checked)
                }
              />
            }
            label="Establecer como plantilla por defecto del territorio"
          />

          {/* Tabla de horarios por día */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Horarios por Día de la Semana
            </Typography>
            <TableContainer sx={{ border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Día</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      ¿Laborable?
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Inicio</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fin</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Descanso (min)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.dayDetails.map((day, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{DAYS_OF_WEEK[day.dayOfWeek]}</TableCell>

                      {/* Checkbox laborable */}
                      <TableCell align="center">
                        <Checkbox
                          checked={day.isWorkDay}
                          onChange={(e) =>
                            handleDayChange(idx, 'isWorkDay', e.target.checked)
                          }
                          size="small"
                        />
                      </TableCell>

                      {/* Hora inicio */}
                      <TableCell>
                        <TextField
                          type="time"
                          value={day.expectedStartTime}
                          onChange={(e) =>
                            handleDayChange(
                              idx,
                              'expectedStartTime',
                              e.target.value
                            )
                          }
                          disabled={!day.isWorkDay}
                          slotProps={{
                            input: { style: { fontSize: '12px' } },
                          }}
                          size="small"
                        />
                      </TableCell>

                      {/* Hora fin */}
                      <TableCell>
                        <TextField
                          type="time"
                          value={day.expectedEndTime}
                          onChange={(e) =>
                            handleDayChange(
                              idx,
                              'expectedEndTime',
                              e.target.value
                            )
                          }
                          disabled={!day.isWorkDay}
                          slotProps={{
                            input: { style: { fontSize: '12px' } },
                          }}
                          size="small"
                        />
                      </TableCell>

                      {/* Descanso */}
                      <TableCell>
                        <TextField
                          type="number"
                          value={day.breakMinutes}
                          onChange={(e) =>
                            handleDayChange(
                              idx,
                              'breakMinutes',
                              parseInt(e.target.value) || 0
                            )
                          }
                          disabled={!day.isWorkDay}
                          slotProps={{
                            input: { min: 0, style: { fontSize: '12px' } },
                          }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : isNew ? 'Crear' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
