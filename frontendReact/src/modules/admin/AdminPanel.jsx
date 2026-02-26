import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, TextField,
  CircularProgress, Chip, Alert, Snackbar, IconButton,
  Tooltip, MenuItem, Autocomplete, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, Edit, Delete, CloudUpload, Refresh,
  CheckCircle, Cancel, Schedule, Policy, People, UploadFile
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../utils/helpers/dateUtils';
import {
  getPolicies, createPolicy, updatePolicy, deletePolicy
} from '../../services/vacationsService';
import {
  getEmployees, toggleEmployeeActive, importEmployeesCSV, getImportRuns
} from '../../services/employeesService';
import {
  getSchedules, createSchedule, updateSchedule, deleteSchedule
} from '../../services/schedulesService';

// ─── Helpers ────────────────────────────────────────────────────────────────
const EMPTY_POLICY = { name: '', year: new Date().getFullYear(), accrualType: 'ANNUAL', totalDaysPerYear: 22, carryOverMaxDays: 5 };
const EMPTY_SCHEDULE = { employeeId: null, validFrom: format(new Date(), 'yyyy-MM-dd'), validTo: '', expectedStartTime: '09:00', expectedEndTime: '18:00', breakMinutes: 60, notes: '' };

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ────────────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Panel de Administración
      </Typography>

      <Paper sx={{ px: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab icon={<Policy />} iconPosition="start" label="Políticas Vacaciones" />
          <Tab icon={<Schedule />} iconPosition="start" label="Horarios Empleados" />
          <Tab icon={<UploadFile />} iconPosition="start" label="Importación CSV" />
          <Tab icon={<People />} iconPosition="start" label="Gestión Empleados" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}><PoliciesTab showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={1}><SchedulesTab showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={2}><ImportTab showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={3}><EmployeesTab showSnack={showSnack} /></TabPanel>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ══════════════════════════════════════════════════════
// TAB 0 — Políticas de Vacaciones
// ══════════════════════════════════════════════════════
function PoliciesTab({ showSnack }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);   // null = crear, object = editar
  const [form, setForm]         = useState(EMPTY_POLICY);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setRows((data || []).map(p => ({ id: p.policyId, ...p })));
    } catch { showSnack('Error cargando políticas', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_POLICY); setDialogOpen(true); };
  const openEdit   = (row) => {
    setEditing(row);
    setForm({
      name: row.name, year: row.year, accrualType: row.accrualType,
      totalDaysPerYear: row.totalDaysPerYear, carryOverMaxDays: row.carryOverMaxDays
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await updatePolicy(editing.id, form);
      else         await createPolicy(form);
      showSnack(editing ? 'Política actualizada' : 'Política creada');
      setDialogOpen(false);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando política', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deletePolicy(deleteId);
      showSnack('Política eliminada');
      setDeleteId(null);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'No se puede eliminar', 'error');
      setDeleteId(null);
    }
  };

  const columns = [
    { field: 'name',             headerName: 'Nombre',       flex: 1 },
    { field: 'year',             headerName: 'Año',          width: 80 },
    { field: 'accrualType',      headerName: 'Tipo',         width: 110 },
    { field: 'totalDaysPerYear', headerName: 'Días/Año',     width: 100 },
    { field: 'carryOverMaxDays', headerName: 'Arrastre máx', width: 120 },
    {
      field: 'acciones', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )
    }
  ];

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nueva Política</Button>
      </Box>
      <Paper sx={{ height: 450 }}>
        {loading
          ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
          : <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} disableRowSelectionOnClick />
        }
      </Paper>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Política' : 'Nueva Política'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Nombre" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
            <TextField label="Año" type="number" value={form.year}
              onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} fullWidth required />
            <TextField select label="Tipo devengo" value={form.accrualType}
              onChange={e => setForm(f => ({ ...f, accrualType: e.target.value }))} fullWidth>
              <MenuItem value="ANNUAL">Anual</MenuItem>
              <MenuItem value="MONTHLY">Mensual</MenuItem>
            </TextField>
            <TextField label="Días por año" type="number" value={form.totalDaysPerYear}
              onChange={e => setForm(f => ({ ...f, totalDaysPerYear: +e.target.value }))} fullWidth required />
            <TextField label="Días de arrastre máx." type="number" value={form.carryOverMaxDays}
              onChange={e => setForm(f => ({ ...f, carryOverMaxDays: +e.target.value }))} fullWidth required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar borrado */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que deseas eliminar esta política? No podrá recuperarse.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════
// TAB 1 — Horarios de Empleados
// ══════════════════════════════════════════════════════
function SchedulesTab({ showSnack }) {
  const [employees, setEmployees]       = useState([]);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [schedules, setSchedules]       = useState([]);
  const [loadingEmp, setLoadingEmp]     = useState(true);
  const [loadingSch, setLoadingSch]     = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(EMPTY_SCHEDULE);
  const [saving, setSaving]             = useState(false);
  const [deleteId, setDeleteId]         = useState(null);

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
      notes: row.notes ?? ''
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
      // Reload
      const d = await getSchedules(selectedEmp.employeeId);
      setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s })));
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando horario', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteSchedule(deleteId);
      showSnack('Horario eliminado');
      setDeleteId(null);
      const d = await getSchedules(selectedEmp.employeeId);
      setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s })));
    } catch { showSnack('Error eliminando horario', 'error'); setDeleteId(null); }
  };

  const columns = [
    { field: 'validFrom', headerName: 'Válido desde', width: 130,
      renderCell: ({ value }) => value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : '-' },
    { field: 'validTo', headerName: 'Válido hasta', width: 130,
      renderCell: ({ value }) => value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : 'Indefinido' },
    { field: 'expectedStartTime', headerName: 'Entrada',  width: 90 },
    { field: 'expectedEndTime',   headerName: 'Salida',   width: 90 },
    { field: 'breakMinutes',      headerName: 'Descanso', width: 100,
      renderCell: ({ value }) => `${value} min` },
    { field: 'notes', headerName: 'Notas', flex: 1 },
    {
      field: 'acciones', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )
    }
  ];

  return (
    <>
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
            <TextField {...params} label="Seleccionar empleado"
              InputProps={{ ...params.InputProps,
                endAdornment: <>{loadingEmp && <CircularProgress size={18} />}{params.InputProps.endAdornment}</>
              }} />
          )}
        />
      </Paper>

      {selectedEmp && (
        <>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Nuevo Horario
            </Button>
          </Box>
          <Paper sx={{ height: 380 }}>
            {loadingSch
              ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
              : <DataGrid rows={schedules} columns={columns} pageSizeOptions={[10]} disableRowSelectionOnClick />
            }
          </Paper>
        </>
      )}

      {!selectedEmp && (
        <Alert severity="info">Selecciona un empleado para gestionar sus horarios.</Alert>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Horario' : 'Nuevo Horario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Válido desde" type="date" value={form.validFrom}
              onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth required />
            <TextField label="Válido hasta (vacío = indefinido)" type="date" value={form.validTo}
              onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth
              helperText="Dejar vacío si el horario no tiene fecha de fin" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Hora entrada" type="time" value={form.expectedStartTime}
                onChange={e => setForm(f => ({ ...f, expectedStartTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth required />
              <TextField label="Hora salida" type="time" value={form.expectedEndTime}
                onChange={e => setForm(f => ({ ...f, expectedEndTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth required />
            </Box>
            <TextField label="Minutos de descanso" type="number" value={form.breakMinutes}
              onChange={e => setForm(f => ({ ...f, breakMinutes: +e.target.value }))}
              fullWidth helperText="Ej: 60 = 1 hora de descanso" />
            <TextField label="Notas (opcional)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent><Typography>¿Eliminar este horario?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════
// TAB 2 — Importación CSV de Axapta
// ══════════════════════════════════════════════════════
function ImportTab({ showSnack }) {
  const fileInputRef            = useRef(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory]   = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getImportRuns();
      setHistory((data || []).map(r => ({ id: r.importRunId, ...r })));
    } catch { showSnack('Error cargando historial', 'error'); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    setLastResult(null);
    try {
      const result = await importEmployeesCSV(file);
      setLastResult(result);
      showSnack(`Importación completada: ${result.total} filas, ${result.errors} errores`);
      loadHistory();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error en la importación', 'error');
    } finally { setImporting(false); }
  };

  const columns = [
    { field: 'fileName', headerName: 'Archivo', flex: 1 },
    { field: 'importedAt', headerName: 'Fecha', width: 160,
      renderCell: ({ value }) => value ? format(toLocalDate(value), 'dd/MM/yyyy HH:mm', { locale: es }) : '-' },
    { field: 'totalRows',   headerName: 'Total',  width: 80 },
    { field: 'successRows', headerName: 'Éxito',  width: 80,
      renderCell: ({ value }) => <Chip label={value} color="success" size="small" /> },
    { field: 'errorRows',   headerName: 'Errores', width: 90,
      renderCell: ({ value }) => <Chip label={value} color={value > 0 ? 'error' : 'default'} size="small" /> },
    { field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => (
        <Chip label={value} color={value === 'Completed' ? 'success' : value === 'Failed' ? 'error' : 'warning'} size="small" />
      )
    },
  ];

  return (
    <>
      {/* Zona de carga */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', border: '2px dashed #ccc', borderRadius: 2 }}>
        <CloudUpload sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>Importar empleados desde CSV (Axapta)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Formato esperado: <code>EmployeeCode, FullName, Email, Company, BusinessUnit, Department, ManagerCode, IsActive, StartDate, EndDate</code>
          <br />
          Los empleados <strong>no presentes</strong> en el CSV serán marcados automáticamente como <strong>Inactivos</strong>.
        </Typography>
        <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileSelect} />
        <Button
          variant="contained"
          size="large"
          startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <UploadFile />}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importando...' : 'Seleccionar archivo CSV'}
        </Button>
      </Paper>

      {/* Resultado de la última importación */}
      {lastResult && (
        <Alert severity={lastResult.errors > 0 ? 'warning' : 'success'} sx={{ mb: 3 }}>
          <strong>Importación finalizada</strong> — ID: {lastResult.importRunId} |
          Total: {lastResult.total} filas | Errores: {lastResult.errors}
        </Alert>
      )}

      {/* Historial de importaciones */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Historial de importaciones</Typography>
        <Tooltip title="Actualizar"><IconButton onClick={loadHistory}><Refresh /></IconButton></Tooltip>
      </Box>
      <Paper sx={{ height: 360 }}>
        {loadingHistory
          ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
          : <DataGrid rows={history} columns={columns} pageSizeOptions={[10, 25]} disableRowSelectionOnClick />
        }
      </Paper>
    </>
  );
}

// ══════════════════════════════════════════════════════
// TAB 3 — Gestión de Empleados (toggle activo)
// ══════════════════════════════════════════════════════
function EmployeesTab({ showSnack }) {
  const [rows, setRows]       = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      // admin endpoint devuelve solo activos; para el panel queremos todos
      // Si el back lo soporta, pasaríamos includeInactive=true; si no, aceptamos lo que viene
      const formatted = (data || []).map(e => ({ id: e.employeeId, ...e }));
      setAllRows(formatted);
      setRows(formatted);
    } catch { showSnack('Error cargando empleados', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    if (!search.trim()) { setRows(allRows); return; }
    const lc = search.toLowerCase();
    setRows(allRows.filter(e =>
      e.fullName?.toLowerCase().includes(lc) ||
      e.employeeCode?.toLowerCase().includes(lc) ||
      e.department?.toLowerCase().includes(lc)
    ));
  };

  const handleToggle = async (id, currentActive) => {
    try {
      const result = await toggleEmployeeActive(id);
      showSnack(result.message);
      setRows(prev => prev.map(r => r.id === id ? { ...r, isActive: result.isActive } : r));
      setAllRows(prev => prev.map(r => r.id === id ? { ...r, isActive: result.isActive } : r));
    } catch { showSnack('Error cambiando estado del empleado', 'error'); }
  };

  const columns = [
    { field: 'employeeCode', headerName: 'Código', width: 110 },
    { field: 'fullName',     headerName: 'Nombre', flex: 1, minWidth: 200 },
    { field: 'department',   headerName: 'Departamento', width: 160 },
    { field: 'company',      headerName: 'Empresa', width: 130 },
    {
      field: 'isActive', headerName: 'Estado', width: 110,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />
      )
    },
    {
      field: 'acciones', headerName: 'Acción', width: 150, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title={row.isActive ? 'Marcar Inactivo' : 'Marcar Activo'}>
          <Button
            size="small"
            variant="outlined"
            color={row.isActive ? 'error' : 'success'}
            onClick={() => handleToggle(row.id, row.isActive)}
          >
            {row.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </Tooltip>
      )
    }
  ];

  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2}>
          <TextField label="Buscar empleado" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            size="small" sx={{ flex: 1 }} />
          <Button variant="contained" onClick={handleSearch}>Buscar</Button>
          <Button variant="outlined" onClick={() => { setSearch(''); setRows(allRows); }}>Limpiar</Button>
          <Tooltip title="Recargar"><IconButton onClick={load}><Refresh /></IconButton></Tooltip>
        </Box>
      </Paper>
      <Paper sx={{ height: 500 }}>
        {loading
          ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
          : <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick />
        }
      </Paper>
    </>
  );
}