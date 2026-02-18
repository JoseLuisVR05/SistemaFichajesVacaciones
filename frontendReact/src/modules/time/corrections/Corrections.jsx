import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, TextField,
  MenuItem, Button, IconButton, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, Tooltip, Autocomplete
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, CheckCircle, Cancel, Visibility,
  Search
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import {
  getCorrections, createCorrection,
  approveCorrection, rejectCorrection
} from '../../../services/correctionsService';
import { getEmployees } from '../../../services/employeesService'
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { useLocation } from 'react-router-dom';
import { useRole } from '../../../hooks/useRole';

// ─── Constantes ──────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada',  color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const formatMinutes = (mins) => {
  if (mins == null) return '-';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  const sign = mins < 0 ? '-' : '';
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

// ─── Componente principal ────────────────────────────────────
export default function Corrections() {
  const { user } = useAuth();
  const { canManageCorrections, canViewEmployees, isManager } = useRole();

  const [activeTab, setActiveTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(
    format(subDays(new Date(), 90), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Diálogos
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Formulario nueva corrección
  const [newCorrection, setNewCorrection] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    originalMinutes: '',
    correctedMinutes: '',
    reason: ''
  });

  // Motivo de rechazo
  const [rejectReason, setRejectReason] = useState('');

  // Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openNew) {
    // Abre el diálogo de nueva corrección y pre-rellena los datos
    setCreateOpen(true);
    if (location.state.date) setNewCorrection(prev => ({ ...prev, date: location.state.date }));
    if (location.state.entryId) setNewCorrection(prev => ({ ...prev, timeEntryId: location.state.entryId }));
  }
}, [location.state])

  useEffect(() => {
    if (canViewEmployees() && activeTab === 1) {
      loadEmployees();
    }
  }, [activeTab]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployees();
      console.log('✅ Empleados cargados para correcciones:', data);
      setEmployees(data);
    } catch (err) {
      console.error('❌ Error cargando empleados:', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: fromDate, to: toDate };
      if (statusFilter !== 'ALL') params.status = statusFilter;

      // Tab 0 = mis solicitudes, Tab 1 = todas (gestión)
      if(activeTab === 0){

          params.includeOwn = true;

      }

      else if(activeTab === 1){

        if(selectedEmployee){
          params.employeeId = selectedEmployee.employeeId;
        }
      }
      
      const data = await getCorrections(params);
      const list = data || [];

      const formattedRows = list.map(c => ({

        id: c.correctionId,
        ...c,
        fechaFormateada: c.date
          ? format(toLocalDate(c.date), 'dd/MM/yyyy', { locale: es })
          : '-',
        creadoFormateado: c.createdAt
          ? format(toLocalDate(c.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
          : '-',
          
      }));

      setRows(formattedRows);

  } catch (err) {
    console.error('Error cargando correcciones:', err);
    setRows([]);
  } finally {
    setLoading(false);
  }
}, [fromDate, toDate, statusFilter, activeTab, user, selectedEmployee]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Helpers ─────────────────────────────────────────────
  const showSnack = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const resetCreateForm = () => {
    setNewCorrection({
      date: format(new Date(), 'yyyy-MM-dd'),
      originalMinutes: '',
      correctedMinutes: '',
      reason: ''
    });
  };

  // ─── Acciones ────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newCorrection.reason.trim()) {
      showSnack('El motivo es obligatorio', 'warning');
      return;
    }

    try {
      await createCorrection({
        date: newCorrection.date,
        originalMinutes: parseInt(newCorrection.originalMinutes) || 0,
        correctedMinutes: parseInt(newCorrection.correctedMinutes) || 0,
        reason: newCorrection.reason.trim()
      });
      showSnack('Solicitud de corrección creada correctamente');
      setCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err) {
      console.error('Error creando corrección:', err);
      showSnack('Error al crear la solicitud', 'error');
    }
  };

  const handleApprove = async (correctionId) => {
    try {
      await approveCorrection(correctionId);
      showSnack('Corrección aprobada');
      loadData();
    } catch (err) {
      console.error('Error aprobando:', err);
      showSnack('Error al aprobar la corrección', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showSnack('Indica el motivo del rechazo', 'warning');
      return;
    }
    try {
      await rejectCorrection(selectedRow.id, rejectReason.trim());
      showSnack('Corrección rechazada');
      setRejectOpen(false);
      setRejectReason('');
      setSelectedRow(null);
      loadData();
    } catch (err) {
      console.error('Error rechazando:', err);
      showSnack('Error al rechazar la corrección', 'error');
    }
  };

  // ─── Columnas ────────────────────────────────────────────
  const baseColumns = [
    { field: 'employeeName', headerName: 'Empleado', width: 180},
    { field: 'fechaFormateada', headerName: 'Fecha', width: 110 },
    {
      field: 'originalMinutes',
      headerName: 'Min. originales',
      width: 130,
      renderCell: ({ value }) => formatMinutes(value)
    },
    {
      field: 'correctedMinutes',
      headerName: 'Min. corregidos',
      width: 130,
      renderCell: ({ value }) => formatMinutes(value)
    },
    { field: 'reason', headerName: 'Motivo', flex: 1, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      renderCell: ({ value }) => {
        const cfg = STATUS_CONFIG[value] || { label: value, color: 'default' };
        return <Chip label={cfg.label} color={cfg.color} size="small" />;
      }
    },
    { field: 'creadoFormateado', headerName: 'Creado', width: 140 },
  ];

  // Columna de acciones solo para gestión (tab 1)
  const managementColumns = [
    ...baseColumns,
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton
              size="small"
              onClick={() => { setSelectedRow(row); setDetailOpen(true); }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'PENDING' && (
            <>
              <Tooltip title="Aprobar">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleApprove(row.id)}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rechazar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setSelectedRow(row);
                    setRejectOpen(true);
                  }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  const myColumns = [
    ...baseColumns.filter(col => col.field !== 'employeeName'),
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 80,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Ver detalle">
          <IconButton
            size="small"
            onClick={() => { setSelectedRow(row); setDetailOpen(true); }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  // ─── Render ──────────────────────────────────────────────
  return (
     <Box
      sx={{width: '75vw', height: '100vh'}}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
      {/* Elemento invisible para balancear el espacio */}
      <Box width={100} visibility="hidden">
        <Button variant="contained" startIcon={<Add />}>
          Nueva Solicitud
        </Button>
      </Box>
  
  <Typography variant="h4">Correcciones de Fichajes</Typography>
  
  <Button
    variant="contained"
    startIcon={<Add />}
    onClick={() => setCreateOpen(true)}
  >
    Nueva Solicitud
  </Button>
</Box>

      {/* Tabs: Mis solicitudes / Gestión */}
      {canManageCorrections() && (
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
          setSelectedEmployee(null);
        }}
          sx={{ mb: 2 }}
        >
          <Tab label="Mis solicitudes" />
          <Tab label="Gestión (todas)" />
        </Tabs>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Desde"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Hasta"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            select
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="PENDING">Pendiente</MenuItem>
            <MenuItem value="APPROVED">Aprobada</MenuItem>
            <MenuItem value="REJECTED">Rechazada</MenuItem>
          </TextField>

          {/*Selector de empleados solo en tab gestión */}
          {activeTab === 1 && canViewEmployees() && (
            <Autocomplete
              options={employees}
              getOptionLabel={(option) =>
                `${option.fullName} (${option.employeeCode})`
              }
              value={selectedEmployee}
              onChange={(_, newValue) => setSelectedEmployee(newValue)}
              loading={loadingEmployees}
              size="small"
              sx={{ minWidth: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isManager() ? "Buscar subordinado" : "Buscar empleado"}
                  placeholder="Nombre, código..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingEmployees ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.employeeId}>
                  <Box>
                    <Typography variant="body2">
                      <strong>{option.fullName}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employeeCode} • {option.department || 'Sin dept.'}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText={
                isManager()
                  ? "No tienes subordinados"
                  : "No se encontraron empleados"
              }
              clearText="Limpiar"
            />
          )}

          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={loadData}
          >
            Buscar
          </Button>

          {/*  Botón para limpiar filtro */}
          {selectedEmployee && (
            <Button
              variant="outlined"
              onClick={() => setSelectedEmployee(null)}
            >
              Ver todas
            </Button>
          )}
        </Box>

        {/* Indicador de filtro activo */}
        {selectedEmployee && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>📋 Correcciones de:</strong> {selectedEmployee.fullName}
            </Typography>
          </Box>
        )}
        
        </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={activeTab === 1 && canManageCorrections() ? managementColumns : myColumns}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>

      {/* ─── Dialog: Nueva corrección ─────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva solicitud de corrección</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Fecha del fichaje"
              type="date"
              value={newCorrection.date}
              onChange={(e) => setNewCorrection({ ...newCorrection, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Minutos originales registrados"
              type="number"
              value={newCorrection.originalMinutes}
              onChange={(e) => setNewCorrection({ ...newCorrection, originalMinutes: e.target.value })}
              helperText="Minutos trabajados que figuran actualmente"
              fullWidth
            />
            <TextField
              label="Minutos corregidos (reales)"
              type="number"
              value={newCorrection.correctedMinutes}
              onChange={(e) => setNewCorrection({ ...newCorrection, correctedMinutes: e.target.value })}
              helperText="Minutos que deberían figurar"
              fullWidth
            />
            <TextField
              label="Motivo de la corrección"
              value={newCorrection.reason}
              onChange={(e) => setNewCorrection({ ...newCorrection, reason: e.target.value })}
              multiline
              rows={3}
              required
              placeholder="Ej: Olvidé fichar la salida, salí a las 18:00"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCreate}>
            Enviar solicitud
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Detalle ──────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedRow(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalle de corrección</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Fecha:</strong> {selectedRow.fechaFormateada}</Typography>
              <Typography>
                <strong>Minutos originales:</strong> {formatMinutes(selectedRow.originalMinutes)}
              </Typography>
              <Typography>
                <strong>Minutos corregidos:</strong> {formatMinutes(selectedRow.correctedMinutes)}
              </Typography>
              <Typography>
                <strong>Diferencia:</strong>{' '}
                {formatMinutes((selectedRow.correctedMinutes || 0) - (selectedRow.originalMinutes || 0))}
              </Typography>
              <Typography><strong>Motivo:</strong> {selectedRow.reason || '-'}</Typography>
              <Typography>
                <strong>Estado:</strong>{' '}
                <Chip
                  label={STATUS_CONFIG[selectedRow.status]?.label || selectedRow.status}
                  color={STATUS_CONFIG[selectedRow.status]?.color || 'default'}
                  size="small"
                />
              </Typography>
              <Typography><strong>Creado:</strong> {selectedRow.creadoFormateado}</Typography>
              {selectedRow.rejectionReason && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <strong>Motivo del rechazo:</strong> {selectedRow.rejectionReason}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetailOpen(false); setSelectedRow(null); }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Motivo de rechazo ────────────────────── */}
      <Dialog
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); setRejectReason(''); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rechazar corrección</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, mt: 1 }}>
            Indica el motivo del rechazo para la corrección del{' '}
            <strong>{selectedRow?.fechaFormateada}</strong>:
          </Typography>
          <TextField
            label="Motivo del rechazo"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            rows={3}
            required
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRejectOpen(false); setRejectReason(''); }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            Confirmar rechazo
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar feedback ────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}