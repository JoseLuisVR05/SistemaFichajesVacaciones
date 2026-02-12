import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Button,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Snackbar, IconButton, Tooltip, MenuItem,
  Autocomplete
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility, Search } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole'
import {
  getVacationRequests, approveVacationRequest, rejectVacationRequest
} from '../services/vacationsService';
import { getEmployees } from '../services/employeesService';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Pendiente', color: 'warning' },
  APPROVED:  { label: 'Aprobada',  color: 'success' },
  REJECTED:  { label: 'Rechazada', color: 'error' },
};

/**
 * VacationApprovals - Bandeja de aprobaciones
 * 
 * Mockup "Bandeja de aprobaciones" (pág. 5):
 * - Filtros: [Empleado] [Estado] [Fechas] [Departamento] [Buscar]
 * - Tabla: Empleado | Fechas | Días | Motivo | Estado | Acciones [Aprobar][Rechazar][Ver]
 */
export default function VacationApprovals() {
  const { user } = useAuth();
  const { hasRole } = useRole();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: Filtros completos según mockup
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'));
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [departments, setDepartments] = useState([]);

  // Diálogos
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Cargar empleados ─────────────────────────────────
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployees();
      setEmployees(data || []);
      // Extraer departamentos únicos para el filtro
      const depts = [...new Set((data || []).map(e => e.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // ─── Carga de datos ───────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (selectedEmployee) params.employeeId = selectedEmployee.employeeId;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      let data = await getVacationRequests(params);

      if (data && hasRole(['MANAGER']) && !hasRole(['ADMIN', 'RRHH'])) {
        data = data.filter(r => r.employeeId !== user?.employeeId);
      }

      // Filtro local de departamento (si el backend no lo soporta)
      if (departmentFilter !== 'ALL' && data) {
        data = data.filter(r => r.department === departmentFilter);
      }

      const formatted = (data || []).map(r => ({
        id: r.requestId,
        ...r,
        startFormatted: r.startDate ? format(new Date(r.startDate), 'dd/MM/yyyy', { locale: es }) : '-',
        endFormatted: r.endDate ? format(new Date(r.endDate), 'dd/MM/yyyy', { locale: es }) : '-',
        createdFormatted: r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
      }));
      setRows(formatted);
    } catch (err) {
      console.error('Error cargando aprobaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedEmployee, fromDate, toDate, departmentFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Aprobar ──────────────────────────────────────────
  const handleApprove = async (requestId) => {
    try {
      await approveVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud aprobada correctamente', severity: 'success' });
      loadData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al aprobar', severity: 'error' });
    }
  };

  // ─── Rechazar ─────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setSnackbar({ open: true, message: 'El motivo del rechazo es obligatorio', severity: 'warning' });
      return;
    }
    try {
      await rejectVacationRequest(selectedRow.id, rejectComment.trim());
      setSnackbar({ open: true, message: 'Solicitud rechazada', severity: 'info' });
      setRejectOpen(false);
      setRejectComment('');
      setSelectedRow(null);
      loadData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al rechazar', severity: 'error' });
    }
  };

  // ─── Columnas — Mockup: Empleado | Fechas | Días | Motivo | Estado | Acciones ─
  const columns = [
    { field: 'employeeName', headerName: 'Empleado', width: 180 },
    { field: 'startFormatted', headerName: 'Desde', width: 110 },
    { field: 'endFormatted', headerName: 'Hasta', width: 110 },
    { field: 'requestedDays', headerName: 'Días', width: 70 },
    // ✅ NUEVO: Columna Motivo (mockup la pide)
    { field: 'comment', headerName: 'Motivo', flex: 1, minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap title={value || ''}>
          {value || '-'}
        </Typography>
      )
    },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => {
        const cfg = STATUS_CONFIG[value] || { label: value, color: 'default' };
        return <Chip label={cfg.label} color={cfg.color} size="small" />;
      }
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => { setSelectedRow(row); setDetailOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'SUBMITTED' && (
            <>
              <Tooltip title="Aprobar">
                <IconButton size="small" color="success" onClick={() => handleApprove(row.id)}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rechazar">
                <IconButton size="small" color="error" onClick={() => {
                  setSelectedRow(row); setRejectOpen(true);
                }}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ width: '75vw' }}>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Bandeja de Aprobaciones
      </Typography>

      {/* ✅ Filtros completos — Mockup: [Empleado] [Estado] [Fechas] [Departamento] [Buscar] */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtro empleado */}
          <Autocomplete
            options={employees}
            getOptionLabel={(option) => `${option.fullName} (${option.employeeCode})`}
            value={selectedEmployee}
            onChange={(_, newValue) => setSelectedEmployee(newValue)}
            loading={loadingEmployees}
            size="small"
            sx={{ minWidth: 250 }}
            renderInput={(params) => (
              <TextField {...params} label="Empleado" placeholder="Buscar empleado..."
                InputProps={{ ...params.InputProps,
                  endAdornment: (<>{loadingEmployees ? <CircularProgress size={20} /> : null}{params.InputProps.endAdornment}</>)
                }} />
            )}
            clearText="Limpiar"
          />

          {/* Filtro estado */}
          <TextField select label="Estado" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="SUBMITTED">Pendientes</MenuItem>
            <MenuItem value="APPROVED">Aprobadas</MenuItem>
            <MenuItem value="REJECTED">Rechazadas</MenuItem>
          </TextField>

          {/* Filtro fechas */}
          <TextField label="Desde" type="date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small" />
          <TextField label="Hasta" type="date" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small" />

          {/* ✅ NUEVO: Filtro departamento (mockup lo pide) */}
          <TextField select label="Departamento" value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>

          <Button variant="contained" startIcon={<Search />} onClick={loadData}>
            Buscar
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25]} disableRowSelectionOnClick />
        )}
      </Paper>

      {/* Dialog: Rechazar */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, mt: 1 }}>
            Rechazar solicitud de <strong>{selectedRow?.employeeName}</strong> del{' '}
            {selectedRow?.startFormatted} al {selectedRow?.endFormatted}:
          </Typography>
          <TextField label="Motivo del rechazo" value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            multiline rows={3} required fullWidth autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRejectOpen(false); setRejectComment(''); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleReject}>Confirmar rechazo</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Detalle */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de solicitud</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Empleado:</strong> {selectedRow.employeeName}</Typography>
              <Typography><strong>Desde:</strong> {selectedRow.startFormatted}</Typography>
              <Typography><strong>Hasta:</strong> {selectedRow.endFormatted}</Typography>
              <Typography><strong>Días:</strong> {selectedRow.requestedDays}</Typography>
              <Typography><strong>Tipo:</strong> {selectedRow.type}</Typography>
              <Typography><strong>Motivo:</strong> {selectedRow.comment || 'Sin motivo'}</Typography>
              <Typography component="div">
                <strong>Estado:</strong>{' '}
                <Chip label={STATUS_CONFIG[selectedRow.status]?.label} color={STATUS_CONFIG[selectedRow.status]?.color} size="small" />
              </Typography>
              {selectedRow.approverComment && (
                <Alert severity="info"><strong>Comentario:</strong> {selectedRow.approverComment}</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}