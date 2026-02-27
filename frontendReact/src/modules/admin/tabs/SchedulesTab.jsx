import { useState, useEffect } from 'react';
import {
  Box, Button, TextField, CircularProgress,
  IconButton, Tooltip, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, Paper, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { Autocomplete } from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../../services/schedulesService';
import { getEmployees } from '../../../services/employeesService';
import { ConfirmDialog, LoadingSpinner } from '../../../components/ui';

const EMPTY_SCHEDULE = {
  employeeId: null,
  validFrom: format(new Date(), 'yyyy-MM-dd'),
  validTo: '',
  expectedStartTime: '09:00',
  expectedEndTime: '18:00',
  breakMinutes: 60,
  notes: '',
};

export function SchedulesTab({ showSnack }) {
  const [employees, setEmployees]     = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [schedules, setSchedules]     = useState([]);
  const [loadingEmp, setLoadingEmp]   = useState(true);
  const [loadingSch, setLoadingSch]   = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_SCHEDULE);
  const [saving, setSaving]           = useState(false);
  const [deleteId, setDeleteId]       = useState(null);

  useEffect(() => {
    getEmployees()
      .then(d => setEmployees(d || []))
      .catch(() => showSnack('Error cargando empleados', 'error'))
      .finally(() => setLoadingEmp(false));
  }, []);

  useEffect(() => {
    if (!selectedEmp) { setSchedules([]); return; }
    setLoadingSch(true);
    getSchedules(selectedEmp.employeeId)
      .then(d => setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s }))))
      .catch(() => showSnack('Error cargando horarios', 'error'))
      .finally(() => setLoadingSch(false));
  }, [selectedEmp]);

  const reloadSchedules = async () => {
    if (!selectedEmp) return;
    const d = await getSchedules(selectedEmp.employeeId);
    setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s })));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_SCHEDULE, employeeId: selectedEmp?.employeeId });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      employeeId: row.employeeId,
      validFrom: row.validFrom?.slice(0, 10) ?? '',
      validTo:   row.validTo?.slice(0, 10) ?? '',
      expectedStartTime: row.expectedStartTime ?? '09:00',
      expectedEndTime:   row.expectedEndTime ?? '18:00',
      breakMinutes: row.breakMinutes,
      notes: row.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
      };
      if (editing) await updateSchedule(editing.id, payload);
      else         await createSchedule(payload);
      showSnack(editing ? 'Horario actualizado' : 'Horario creado');
      setDialogOpen(false);
      await reloadSchedules();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando horario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSchedule(deleteId);
      showSnack('Horario eliminado');
      setDeleteId(null);
      await reloadSchedules();
    } catch {
      showSnack('Error eliminando horario', 'error');
      setDeleteId(null);
    }
  };

  const columns = [
    {
      field: 'validFrom', headerName: 'Válido desde', width: 130,
      renderCell: ({ value }) =>
        value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : '-',
    },
    {
      field: 'validTo', headerName: 'Válido hasta', width: 130,
      renderCell: ({ value }) =>
        value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : 'Indefinido',
    },
    { field: 'expectedStartTime', headerName: 'Entrada',  width: 90 },
    { field: 'expectedEndTime',   headerName: 'Salida',   width: 90 },
    {
      field: 'breakMinutes', headerName: 'Descanso', width: 100,
      renderCell: ({ value }) => `${value} min`,
    },
    { field: 'notes', headerName: 'Notas', flex: 1 },
    {
      field: 'acciones', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <>
      {/* Selector de empleado */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Autocomplete
          options={employees}
          getOptionLabel={o => `${o.fullName} (${o.employeeCode})`}
          value={selectedEmp}
          onChange={(_, v) => setSelectedEmp(v)}
          loading={loadingEmp}
          size="small"
          sx={{ maxWidth: 400 }}
          renderInput={params => (
            <TextField
              {...params} label="Seleccionar empleado"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingEmp && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Paper>

      {/* Sin empleado seleccionado */}
      {!selectedEmp && (
        <Alert severity="info">
          Selecciona un empleado para gestionar sus horarios.
        </Alert>
      )}

      {/* Tabla de horarios */}
      {selectedEmp && (
        <>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Nuevo Horario
            </Button>
          </Box>
          <Paper sx={{ height: 380 }}>
            {loadingSch
              ? <LoadingSpinner />
              : <DataGrid
                  rows={schedules}
                  columns={columns}
                  pageSizeOptions={[10]}
                  disableRowSelectionOnClick
                />
            }
          </Paper>
        </>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Horario' : 'Nuevo Horario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Válido desde" type="date" value={form.validFrom}
              onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth required
            />
            <TextField
              label="Válido hasta (vacío = indefinido)" type="date" value={form.validTo}
              onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth
              helperText="Dejar vacío si el horario no tiene fecha de fin"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hora entrada" type="time" value={form.expectedStartTime}
                onChange={e => setForm(f => ({ ...f, expectedStartTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth required
              />
              <TextField
                label="Hora salida" type="time" value={form.expectedEndTime}
                onChange={e => setForm(f => ({ ...f, expectedEndTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth required
              />
            </Box>
            <TextField
              label="Minutos de descanso" type="number" value={form.breakMinutes}
              onChange={e => setForm(f => ({ ...f, breakMinutes: +e.target.value }))}
              fullWidth helperText="Ej: 60 = 1 hora de descanso"
            />
            <TextField
              label="Notas (opcional)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              multiline rows={2} fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ ConfirmDialog reutilizable */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar eliminación"
        description="¿Eliminar este horario?"
        confirmLabel="Eliminar"
        confirmColor="error"
      />
    </>
  );
}