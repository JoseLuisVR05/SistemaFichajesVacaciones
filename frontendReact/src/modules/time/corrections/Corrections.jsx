import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, TextField,
  MenuItem, Button, IconButton, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, Tooltip, Autocomplete
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, CheckCircle, Cancel, Visibility, Search,
  Edit, DeleteForever
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import {
  getCorrections, createCorrection, updateCorrection,
  deleteCorrection, approveCorrection, rejectCorrection
} from '../../../services/correctionsService';
import { getEmployees } from '../../../services/employeesService';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { useLocation } from 'react-router-dom';
import { useRole } from '../../../hooks/useRole';

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada',  color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const formatMinutes = (mins) => {
  if (mins == null) return '-';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${mins < 0 ? '-' : ''}${h}h ${String(m).padStart(2, '0')}m`;
};

export default function Corrections() {
  const { user }  = useAuth();
  const { canManageCorrections, canViewEmployees, isManager } = useRole();

  const [activeTab, setActiveTab] = useState(0);
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);

  const [employees, setEmployees]               = useState([]);
  const [selectedEmployee, setSelectedEmployee]  = useState(null);
  const [loadingEmployees, setLoadingEmployees]  = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [toDate, setToDate]     = useState(format(new Date(), 'yyyy-MM-dd'));

  // Diálogos
  const [createOpen, setCreateOpen]   = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Formularios
  const [newCorrection, setNewCorrection] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    originalMinutes: '', correctedMinutes: '', reason: ''
  });
  const [editForm, setEditForm]     = useState({ correctedMinutes: '', reason: '' });
  const [rejectReason, setRejectReason] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const location = useLocation();

  // Abrir desde TimeClockPage (incidencia)
  useEffect(() => {
    if (location.state?.openNew) {
      setCreateOpen(true);
      if (location.state.date)
        setNewCorrection(prev => ({ ...prev, date: location.state.date }));
    }
  }, [location.state]);

  useEffect(() => {
    if (canViewEmployees() && activeTab === 1) loadEmployees();
  }, [activeTab]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try { setEmployees(await getEmployees() || []); }
    catch { setEmployees([]); }
    finally { setLoadingEmployees(false); }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: fromDate, to: toDate };
      if (statusFilter !== 'ALL') params.status = statusFilter;

      if (activeTab === 0) {
        params.includeOwn = true;
      } else if (activeTab === 1 && selectedEmployee) {
        params.employeeId = selectedEmployee.employeeId;
      }

      const data = await getCorrections(params);
      setRows((data || []).map(c => ({
        id: c.correctionId, ...c,
        fechaFormateada:   c.date      ? format(toLocalDate(c.date),      'dd/MM/yyyy',       { locale: es }) : '-',
        creadoFormateado:  c.createdAt ? format(toLocalDate(c.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
      })));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [fromDate, toDate, statusFilter, activeTab, selectedEmployee]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Acciones ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newCorrection.reason.trim()) { showSnack('El motivo es obligatorio', 'warning'); return; }
    try {
      await createCorrection({
        date: newCorrection.date,
        correctedMinutes: parseInt(newCorrection.correctedMinutes) || 0,
        reason: newCorrection.reason.trim()
      });
      showSnack('Solicitud creada correctamente');
      setCreateOpen(false);
      setNewCorrection({ date: format(new Date(), 'yyyy-MM-dd'), originalMinutes: '', correctedMinutes: '', reason: '' });
      loadData();
    } catch (err) { showSnack(err.response?.data?.message || 'Error al crear', 'error'); }
  };

  // Req #5 — Editar corrección propia pendiente
  const handleEdit = async () => {
    if (!editForm.reason.trim()) { showSnack('El motivo es obligatorio', 'warning'); return; }
    try {
      await updateCorrection(selectedRow.id, {
        correctedMinutes: parseInt(editForm.correctedMinutes),
        reason: editForm.reason.trim()
      });
      showSnack('Corrección actualizada');
      setEditOpen(false);
      setSelectedRow(null);
      loadData();
    } catch (err) { showSnack(err.response?.data?.message || 'Error al actualizar', 'error'); }
  };

  // Req #5 — Cancelar/eliminar corrección propia pendiente
  const handleDelete = async () => {
    try {
      await deleteCorrection(selectedRow.id);
      showSnack('Corrección cancelada', 'info');
      setDeleteOpen(false);
      setSelectedRow(null);
      loadData();
    } catch (err) { showSnack(err.response?.data?.message || 'Error al cancelar', 'error'); }
  };

  const handleApprove = async (correctionId) => {
    try {
      await approveCorrection(correctionId);
      showSnack('Corrección aprobada');
      loadData();
    } catch (err) { showSnack('Error al aprobar', 'error'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { showSnack('Indica el motivo del rechazo', 'warning'); return; }
    try {
      await rejectCorrection(selectedRow.id, rejectReason.trim());
      showSnack('Corrección rechazada');
      setRejectOpen(false);
      setRejectReason('');
      setSelectedRow(null);
      loadData();
    } catch { showSnack('Error al rechazar', 'error'); }
  };

  // ─── Columnas ──────────────────────────────────────────────────────────

  const baseColumns = [
    { field: 'fechaFormateada',    headerName: 'Fecha',           width: 110 },
    { field: 'originalMinutes',    headerName: 'Min. originales', width: 130,
      renderCell: ({ value }) => formatMinutes(value) },
    { field: 'correctedMinutes',   headerName: 'Min. corregidos', width: 130,
      renderCell: ({ value }) => formatMinutes(value) },
    { field: 'reason',             headerName: 'Motivo',          flex: 1, minWidth: 200 },
    { field: 'status',             headerName: 'Estado',          width: 120,
      renderCell: ({ value }) => {
        const cfg = STATUS_CONFIG[value] || { label: value, color: 'default' };
        return <Chip label={cfg.label} color={cfg.color} size="small" />;
      }
    },
    { field: 'creadoFormateado',   headerName: 'Creado',          width: 140 },
  ];

  // Tab 0 — "Mis solicitudes": incluye editar y cancelar propias si PENDING
  const myColumns = [
    ...baseColumns,
    {
      field: 'acciones', headerName: 'Acciones', width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => { setSelectedRow(row); setDetailOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Req #5: editar solo si PENDING y es propia */}
          {row.status === 'PENDING' && (
            <>
              <Tooltip title="Editar solicitud">
                <IconButton size="small" color="primary"
                  onClick={() => {
                    setSelectedRow(row);
                    setEditForm({ correctedMinutes: row.correctedMinutes, reason: row.reason });
                    setEditOpen(true);
                  }}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar solicitud">
                <IconButton size="small" color="error"
                  onClick={() => { setSelectedRow(row); setDeleteOpen(true); }}>
                  <DeleteForever fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  // Tab 1 — "Gestión": managers ven y aprueban/rechazan
  const managementColumns = [
    { field: 'employeeName', headerName: 'Empleado', width: 180 },
    ...baseColumns,
    {
      field: 'acciones', headerName: 'Acciones', width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => { setSelectedRow(row); setDetailOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'PENDING' && (
            <>
              <Tooltip title="Aprobar">
                <IconButton size="small" color="success" onClick={() => handleApprove(row.id)}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rechazar">
                <IconButton size="small" color="error"
                  onClick={() => { setSelectedRow(row); setRejectOpen(true); }}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box width={140} visibility="hidden">
          <Button variant="contained" startIcon={<Add />}>Nueva</Button>
        </Box>
        <Typography variant="h4">Correcciones de Fichajes</Typography>
        {/* Req #5 – Solo el empleado puede crear correcciones propias.
            El botón se muestra en ambos tabs pero siempre actúa sobre
            el usuario autenticado (la API lo garantiza en el servidor). */}
        <Tooltip title={activeTab === 1 ? 'Solo puedes solicitar correcciones propias' : ''}>
          <span>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Nueva solicitud
            </Button>
          </span>
        </Tooltip>
      </Box>

      {canManageCorrections() && (
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setSelectedEmployee(null); }} sx={{ mt: 2, mb: 1 }}>
          <Tab label="Mis solicitudes" />
          <Tab label="Gestión (equipo)" />
        </Tabs>
      )}

      {/* ── Filtros ── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField label="Desde" type="date" value={fromDate}
            onChange={e => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          <TextField label="Hasta" type="date" value={toDate}
            onChange={e => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          <TextField select label="Estado" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="PENDING">Pendiente</MenuItem>
            <MenuItem value="APPROVED">Aprobada</MenuItem>
            <MenuItem value="REJECTED">Rechazada</MenuItem>
          </TextField>

          {activeTab === 1 && canViewEmployees() && (
            <Autocomplete
              options={employees}
              getOptionLabel={o => `${o.fullName} (${o.employeeCode})`}
              value={selectedEmployee}
              onChange={(_, v) => setSelectedEmployee(v)}
              loading={loadingEmployees}
              size="small" sx={{ minWidth: 300 }}
              renderInput={params => (
                <TextField {...params}
                  label={isManager() ? 'Buscar subordinado' : 'Buscar empleado'}
                  InputProps={{ ...params.InputProps,
                    endAdornment: <>{loadingEmployees && <CircularProgress size={20} />}{params.InputProps.endAdornment}</>
                  }} />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.employeeId}>
                  <Box>
                    <Typography variant="body2"><strong>{option.fullName}</strong></Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employeeCode} • {option.department || 'Sin dept.'}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          )}

          <Button variant="contained" startIcon={<Search />} onClick={loadData}>Buscar</Button>
          {selectedEmployee && (
            <Button variant="outlined" onClick={() => setSelectedEmployee(null)}>Ver todas</Button>
          )}
        </Box>
        {selectedEmployee && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Correcciones de:</strong> {selectedEmployee.fullName}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* ── Tabla ── */}
      <Paper sx={{ height: 500 }}>
        {loading
          ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
          : <DataGrid
              rows={rows}
              columns={activeTab === 1 && canManageCorrections() ? managementColumns : myColumns}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
            />
        }
      </Paper>

      {/* ── Dialog: Nueva corrección ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva solicitud de corrección</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Fecha del fichaje" type="date" value={newCorrection.date}
              onChange={e => setNewCorrection(n => ({ ...n, date: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Minutos originales registrados" type="number"
              value={newCorrection.originalMinutes}
              onChange={e => setNewCorrection(n => ({ ...n, originalMinutes: e.target.value }))}
              helperText="Minutos trabajados que figuran actualmente" fullWidth />
            <TextField label="Minutos corregidos (reales)" type="number"
              value={newCorrection.correctedMinutes}
              onChange={e => setNewCorrection(n => ({ ...n, correctedMinutes: e.target.value }))}
              helperText="Minutos que deberían figurar" fullWidth />
            <TextField label="Motivo de la corrección" value={newCorrection.reason}
              onChange={e => setNewCorrection(n => ({ ...n, reason: e.target.value }))}
              multiline rows={3} required
              placeholder="Ej: Olvidé fichar la salida, salí a las 18:00" fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Enviar solicitud</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Editar corrección propia (Req #5) ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar solicitud de corrección</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Editando la corrección del <strong>{selectedRow?.fechaFormateada}</strong>
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Minutos corregidos (reales)" type="number"
              value={editForm.correctedMinutes}
              onChange={e => setEditForm(f => ({ ...f, correctedMinutes: e.target.value }))}
              helperText="Minutos que deberían figurar" fullWidth required />
            <TextField label="Motivo actualizado" value={editForm.reason}
              onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
              multiline rows={3} required fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEdit}>Guardar cambios</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Confirmar cancelación (Req #5) ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar solicitud</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas cancelar la solicitud del{' '}
            <strong>{selectedRow?.fechaFormateada}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>No, mantener</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Sí, cancelar solicitud
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Detalle ── */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedRow(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de corrección</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Fecha:</strong> {selectedRow.fechaFormateada}</Typography>
              <Typography><strong>Min. originales:</strong> {formatMinutes(selectedRow.originalMinutes)}</Typography>
              <Typography><strong>Min. corregidos:</strong> {formatMinutes(selectedRow.correctedMinutes)}</Typography>
              <Typography><strong>Diferencia:</strong>{' '}
                {formatMinutes((selectedRow.correctedMinutes || 0) - (selectedRow.originalMinutes || 0))}
              </Typography>
              <Typography><strong>Motivo:</strong> {selectedRow.reason || '-'}</Typography>
              <Typography component="div"><strong>Estado:</strong>{' '}
                <Chip
                  label={STATUS_CONFIG[selectedRow.status]?.label || selectedRow.status}
                  color={STATUS_CONFIG[selectedRow.status]?.color || 'default'}
                  size="small" />
              </Typography>
              <Typography><strong>Creado:</strong> {selectedRow.creadoFormateado}</Typography>
              {selectedRow.employeeName && (
                <Typography><strong>Empleado:</strong> {selectedRow.employeeName}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetailOpen(false); setSelectedRow(null); }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Motivo de rechazo ── */}
      <Dialog open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectReason(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Rechazar corrección</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, mt: 1 }}>
            Indica el motivo del rechazo para la corrección del{' '}
            <strong>{selectedRow?.fechaFormateada}</strong>:
          </Typography>
          <TextField label="Motivo del rechazo" value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            multiline rows={3} required fullWidth autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRejectOpen(false); setRejectReason(''); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleReject}>Confirmar rechazo</Button>
        </DialogActions>
      </Dialog>

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