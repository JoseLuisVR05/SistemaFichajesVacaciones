import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, TextField, Button,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, IconButton, Tooltip, MenuItem, Tabs, Tab
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, Send, Cancel, Visibility, CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import {
  getVacationRequests, createVacationRequest, submitVacationRequest,
  cancelVacationRequest, validateVacationDates
} from '../services/vacationsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Estados
const STATUS_CONFIG = {
  DRAFT:     { label: 'Borrador',   color: 'default' },
  SUBMITTED: { label: 'Enviada',    color: 'info' },
  APPROVED:  { label: 'Aprobada',   color: 'success' },
  REJECTED:  { label: 'Rechazada',  color: 'error' },
  CANCELLED: { label: 'Cancelada',  color: 'default' },
};

/**
 * VacationRequests - Página de solicitudes de vacaciones
 * 
 * Flujo del usuario:
 * 1. Clic en "Nueva solicitud" → se abre diálogo con selector de fechas
 * 2. Al seleccionar fechas → se valida contra el backend (días laborables, saldo, solapamientos)
 * 3. Si es válido → se crea en estado DRAFT
 * 4. El usuario puede ENVIAR (SUBMITTED) o CANCELAR
 * 5. Un manager/RRHH aprueba o rechaza desde la página de Aprobaciones
 * 
 * Permisos:
 * - Cualquier empleado puede crear solicitudes propias
 * - La tabla muestra solo solicitudes propias (EMPLOYEE) o del equipo (MANAGER+)
 */
export default function VacationRequests() {
  const { user } = useAuth();
  const { canManageCorrections } = useRole(); // Reutilizamos: misma lógica de roles

  // Estado 
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Diálogo de creación
  const [createOpen, setCreateOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '', endDate: '', type: 'VACATION'
  });
  const [validation, setValidation] = useState(null);   // Resultado de validar fechas
  const [validating, setValidating] = useState(false);   // Está validando?
  const [creating, setCreating] = useState(false);        // Está creando?

  // Diálogo de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Carga de datos ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const data = await getVacationRequests(params);
      const formatted = (data || []).map(r => ({
        id: r.requestId,
        ...r,
        startFormatted: r.startDate
          ? format(new Date(r.startDate), 'dd/MM/yyyy', { locale: es })
          : '-',
        endFormatted: r.endDate
          ? format(new Date(r.endDate), 'dd/MM/yyyy', { locale: es })
          : '-',
      }));
      setRows(formatted);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Validar fechas en tiempo real ─────────────────────
  /**
   * Cuando el usuario selecciona ambas fechas, llamamos al backend
   * para que nos diga cuántos días laborables son, si tiene saldo
   * suficiente, y si hay solapamientos.
   * Esto permite mostrar feedback ANTES de crear la solicitud.
   */
  const handleValidateDates = async () => {
    if (!newRequest.startDate || !newRequest.endDate) return;

    setValidating(true);
    setValidation(null);
    try {
      const result = await validateVacationDates(
        newRequest.startDate,
        newRequest.endDate
      );
      setValidation(result);
    } catch (err) {
      console.error('Error validando fechas:', err);
      setValidation({
        isValid: false,
        errors: ['Error al validar las fechas. Inténtalo de nuevo.'],
        warnings: [],
        workingDays: 0,
        availableDays: 0
      });
    } finally {
      setValidating(false);
    }
  };

  // Se ejecuta cada vez que cambian las fechas
  useEffect(() => {
    if (newRequest.startDate && newRequest.endDate) {
      // Pequeño debounce para no saturar el backend
      const timer = setTimeout(handleValidateDates, 500);
      return () => clearTimeout(timer);
    }
  }, [newRequest.startDate, newRequest.endDate]);

  // ─── Crear solicitud ──────────────────────────────────
  const handleCreate = async () => {
    if (!validation?.isValid) return;

    setCreating(true);
    try {
      const result = await createVacationRequest({
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        type: newRequest.type
      });
      setSnackbar({
        open: true,
        message: `Solicitud creada (${result.requestedDays} días). Recuerda enviarla para aprobación.`,
        severity: 'success'
      });
      setCreateOpen(false);
      setNewRequest({ startDate: '', endDate: '', type: 'VACATION' });
      setValidation(null);
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al crear la solicitud',
        severity: 'error'
      });
    } finally {
      setCreating(false);
    }
  };

  // ─── Enviar solicitud (DRAFT → SUBMITTED) ─────────────
  const handleSubmit = async (requestId) => {
    try {
      await submitVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud enviada para aprobación', severity: 'success' });
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al enviar',
        severity: 'error'
      });
    }
  };

  // ─── Cancelar solicitud ───────────────────────────────
  const handleCancel = async (requestId) => {
    try {
      await cancelVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud cancelada', severity: 'info' });
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al cancelar',
        severity: 'error'
      });
    }
  };

  // ─── Columnas del DataGrid ────────────────────────────
  const columns = [
    { field: 'employeeName', headerName: 'Empleado', width: 180 },
    { field: 'startFormatted', headerName: 'Desde', width: 110 },
    { field: 'endFormatted', headerName: 'Hasta', width: 110 },
    { field: 'requestedDays', headerName: 'Días', width: 80, type: 'number' },
    {
      field: 'type', headerName: 'Tipo', width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'VACATION' ? 'Vacaciones' : value === 'PERSONAL' ? 'Personal' : value}
          size="small"
          variant="outlined"
        />
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
      field: 'acciones', headerName: 'Acciones', width: 180, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => { setSelectedRow(row); setDetailOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Solo se puede enviar si está en DRAFT */}
          {row.status === 'DRAFT' && (
            <Tooltip title="Enviar para aprobación">
              <IconButton size="small" color="primary" onClick={() => handleSubmit(row.id)}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {/* Solo se puede cancelar si está en DRAFT o SUBMITTED */}
          {(row.status === 'DRAFT' || row.status === 'SUBMITTED') && (
            <Tooltip title="Cancelar">
              <IconButton size="small" color="error" onClick={() => handleCancel(row.id)}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  // ─── Render ───────────────────────────────────────────
  return (
    <Box sx={{ width: '75vw' }}>
      {/* Cabecera */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box width={140} />
        <Typography variant="h4">Solicitudes de Vacaciones</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Nueva solicitud
        </Button>
      </Box>

      {/* Filtro por estado */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select label="Estado" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small" sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          <MenuItem value="DRAFT">Borrador</MenuItem>
          <MenuItem value="SUBMITTED">Enviada</MenuItem>
          <MenuItem value="APPROVED">Aprobada</MenuItem>
          <MenuItem value="REJECTED">Rechazada</MenuItem>
          <MenuItem value="CANCELLED">Cancelada</MenuItem>
        </TextField>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows} columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>

      {/* ─── Dialog: Nueva solicitud ──────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva solicitud de vacaciones</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Selector de fechas */}
            <TextField
              label="Fecha inicio" type="date" value={newRequest.startDate}
              onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth
            />
            <TextField
              label="Fecha fin" type="date" value={newRequest.endDate}
              onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }} fullWidth
            />
            <TextField
              select label="Tipo" value={newRequest.type}
              onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
              fullWidth
            >
              <MenuItem value="VACATION">Vacaciones</MenuItem>
              <MenuItem value="PERSONAL">Asuntos personales</MenuItem>
              <MenuItem value="OTHER">Otro</MenuItem>
            </TextField>

            {/* Resultado de la validación en tiempo real */}
            {validating && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}

            {validation && (
              <Box>
                {/* Resumen de días */}
                <Alert severity={validation.isValid ? 'success' : 'error'} sx={{ mb: 1 }}>
                  <strong>Días laborables:</strong> {validation.workingDays} |{' '}
                  <strong>Disponibles:</strong> {validation.availableDays}
                </Alert>

                {/* Errores bloqueantes */}
                {validation.errors?.map((err, i) => (
                  <Alert key={i} severity="error" sx={{ mb: 0.5 }}>{err}</Alert>
                ))}

                {/* Advertencias informativas */}
                {validation.warnings?.map((warn, i) => (
                  <Alert key={i} severity="warning" sx={{ mb: 0.5 }}>{warn}</Alert>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setValidation(null); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!validation?.isValid || creating}
            startIcon={creating ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            Crear solicitud
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Detalle ─────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de solicitud</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Empleado:</strong> {selectedRow.employeeName}</Typography>
              <Typography><strong>Desde:</strong> {selectedRow.startFormatted}</Typography>
              <Typography><strong>Hasta:</strong> {selectedRow.endFormatted}</Typography>
              <Typography><strong>Días solicitados:</strong> {selectedRow.requestedDays}</Typography>
              <Typography><strong>Tipo:</strong> {selectedRow.type}</Typography>
              <Typography>
                <strong>Estado:</strong>{' '}
                <Chip
                  label={STATUS_CONFIG[selectedRow.status]?.label || selectedRow.status}
                  color={STATUS_CONFIG[selectedRow.status]?.color || 'default'}
                  size="small"
                />
              </Typography>
              {selectedRow.approverComment && (
                <Alert severity={selectedRow.status === 'REJECTED' ? 'error' : 'info'}>
                  <strong>Comentario del aprobador:</strong> {selectedRow.approverComment}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}