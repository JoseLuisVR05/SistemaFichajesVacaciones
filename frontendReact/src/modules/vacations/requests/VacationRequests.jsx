import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, TextField, Button,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, IconButton, Tooltip, MenuItem, Card, CardContent, Grid,
  Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, Send, Cancel, Visibility, CheckCircle,
  AccountBalanceWallet, EventBusy, EventAvailable
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { useRole } from '../../../hooks/useRole';
import {
  getVacationRequests, createVacationRequest, submitVacationRequest,
  cancelVacationRequest, validateVacationDates, getBalance
} from '../../../services/vacationsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
  DRAFT:     { label: 'Borrador',   color: 'default' },
  SUBMITTED: { label: 'Enviada',    color: 'info' },
  APPROVED:  { label: 'Aprobada',   color: 'success' },
  REJECTED:  { label: 'Rechazada',  color: 'error' },
  CANCELLED: { label: 'Cancelada',  color: 'default' },
};

/**
 * VacationRequests - Página de solicitudes de vacaciones
 * - Saldo arriba: Asignados | Usados | Restantes
 * - Formulario: Fecha inicio | Fecha fin | Tipo | Comentario
 * - Botones: [Enviar] [Guardar borrador] [Cancelar]
 * - Cálculo automático: Días solicitados | Festivos/fines de semana | Validaciones
 * - Calendario contexto del equipo
 */
export default function VacationRequests() {
  const { user } = useAuth();
  const { canManageCorrections } = useRole();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Saldo del usuario 
  const [myBalance, setMyBalance] = useState(null);

  // Diálogo de creación
  const [createOpen, setCreateOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '', endDate: '', type: 'VACATION', comment: ''
  });
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Diálogo de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Cargar saldo
  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const balance = await getBalance({ year: new Date().getFullYear() });
      setMyBalance(balance);
    } catch (err) {
      console.error('Error cargando saldo:', err);
    }
  };

  // Carga de solicitudes 
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await getVacationRequests(params);
      const formatted = (data || []).map(r => ({
        id: r.requestId,
        ...r,
        startFormatted: r.startDate ? format(new Date(r.startDate), 'dd/MM/yyyy', { locale: es }) : '-',
        endFormatted: r.endDate ? format(new Date(r.endDate), 'dd/MM/yyyy', { locale: es }) : '-',
      }));
      setRows(formatted);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Validar fechas
  const handleValidateDates = async () => {
    if (!newRequest.startDate || !newRequest.endDate) return;
    setValidating(true);
    setValidation(null);
    try {
      const result = await validateVacationDates(newRequest.startDate, newRequest.endDate);
      setValidation(result);
    } catch (err) {
      setValidation({
        isValid: false,
        errors: ['Error al validar las fechas. Inténtalo de nuevo.'],
        warnings: [], workingDays: 0, availableDays: 0
      });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (newRequest.startDate && newRequest.endDate) {
      const timer = setTimeout(handleValidateDates, 500);
      return () => clearTimeout(timer);
    }
  }, [newRequest.startDate, newRequest.endDate]);

  // Crear solicitud (y opcionalmente enviar)
  const handleCreate = async (autoSubmit = false) => {
    if (!validation?.isValid) return;
    setCreating(true);
    try {
      const result = await createVacationRequest({
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        type: newRequest.type,
        comment: newRequest.comment
      });

      // Si autoSubmit=true, enviamos directamente para aprobación
      if (autoSubmit && result?.requestId) {
        try {
          await submitVacationRequest(result.requestId);
          setSnackbar({
            open: true,
            message: `Solicitud creada y enviada (${result.requestedDays} días).`,
            severity: 'success'
          });
        } catch {
          setSnackbar({
            open: true,
            message: `Solicitud creada como borrador (${result.requestedDays} días). Error al enviar automáticamente.`,
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: `Borrador guardado (${result.requestedDays} días). Recuerda enviarlo para aprobación.`,
          severity: 'success'
        });
      }

      setCreateOpen(false);
      setNewRequest({ startDate: '', endDate: '', type: 'VACATION', comment: '' });
      setValidation(null);
      loadData();
      loadBalance(); // Refrescar saldo
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

  const handleSubmit = async (requestId) => {
    try {
      await submitVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud enviada para aprobación', severity: 'success' });
      loadData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al enviar', severity: 'error' });
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await cancelVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud cancelada', severity: 'info' });
      loadData();
      loadBalance();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Error al cancelar', severity: 'error' });
    }
  };

  // Columnas
  const columns = [
    { field: 'startFormatted', headerName: 'Desde', width: 110 },
    { field: 'endFormatted', headerName: 'Hasta', width: 110 },
    { field: 'requestedDays', headerName: 'Días', width: 80, type: 'number' },
    {
      field: 'type', headerName: 'Tipo', width: 110,
      renderCell: ({ value }) => (
        <Chip label={value === 'VACATION' ? 'Vacaciones' : value === 'PERSONAL' ? 'Personal' : value}
          size="small" variant="outlined" />
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
          {row.status === 'DRAFT' && (
            <Tooltip title="Enviar para aprobación">
              <IconButton size="small" color="primary" onClick={() => handleSubmit(row.id)}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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

  return (
    <Box sx={{ width: '75vw', height: '100vh' }}>
      {/* Cabecera */}
      <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
        <Box width={140} />
        <Typography variant="h4">Solicitud de Vacaciones</Typography>
      </Box>

      {/* Asignados | Usados | Restantes */}
      {myBalance && (
        <Grid container spacing={8} sx={{ mb: 3 } }>
          <Grid item xs={12} sm={4} size={4}>
            <Card sx={{ bgcolor: '#f5f5f5' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <AccountBalanceWallet color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Asignados</Typography>
                  <Typography variant="h5" fontWeight="700">{myBalance.allocatedDays} Días </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4} size={4}>
            <Card sx={{ bgcolor: '#fff3f0' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <EventBusy color="error" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Usados</Typography>
                  <Typography variant="h5" fontWeight="700">{myBalance.usedDays} Días</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4} size={4}>
            <Card sx={{ bgcolor: '#f0faf0' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <EventAvailable color="success" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Restantes</Typography>
                  <Typography variant="h5" fontWeight="700">{myBalance.remainingDays} Días</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Layout principal: Formulario + Cálculo + Calendario */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        
        {/* Columna izquierda: Formulario */}
        <Grid item xs={12} md={6} size={7} >
          <Paper sx={{ p: 3  }} >
            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ textAlign: 'center' }} >
              Nueva solicitud
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Fecha inicio" type="date" value={newRequest.startDate}
                onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Fecha fin" type="date" value={newRequest.endDate}
                onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }} fullWidth />
              <TextField select label="Tipo" value={newRequest.type}
                onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })} fullWidth>
                <MenuItem value="VACATION">Vacaciones</MenuItem>
                <MenuItem value="PERSONAL">Asuntos personales</MenuItem>
                <MenuItem value="OTHER">Otro</MenuItem>
              </TextField>
              <TextField label="Comentario (opcional)" value={newRequest.comment}
                onChange={(e) => setNewRequest({ ...newRequest, comment: e.target.value })}
                multiline rows={3} fullWidth
                placeholder="Ej: Viaje familiar, motivo personal..." />
              
              {/* Botones */}
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Button variant="contained" onClick={() => handleCreate(true)}
                  disabled={!validation?.isValid || creating}
                  startIcon={creating ? <CircularProgress size={16} /> : <Send />}>
                  Enviar
                </Button>
                <Button variant="outlined" onClick={() => handleCreate(false)}
                  disabled={!validation?.isValid || creating}>
                  Guardar borrador
                </Button>
                <Button onClick={() => {
                  setNewRequest({ startDate: '', endDate: '', type: 'VACATION', comment: '' });
                  setValidation(null);
                }}>
                  Cancelar
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Columna derecha: Cálculo automático + Calendario contexto */}
        <Grid item xs={12} md={6} size={5} >
          {/* Cálculo automático */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Cálculo automático
            </Typography>
            {validating && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
            {!validation && !validating && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Selecciona las fechas para ver el cálculo de días.
              </Typography>
            )}
            {validation && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Días solicitados:</Typography>
                  <Typography variant="body2" fontWeight="600">{validation.workingDays}</Typography>
                </Box>
                {/*<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Festivos/fines de semana:</Typography>
                  <Typography variant="body2" fontWeight="600" color="text.secondary">
                    {validation.totalDays ? validation.totalDays - validation.workingDays : '-'}
                  </Typography>
                </Box>*/}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Días disponibles:</Typography>
                  <Typography variant="body2" fontWeight="600">{validation.availableDays}</Typography>
                </Box>
                <Divider />
                {validation.isValid && (
                  <Alert severity="success" sx={{ py: 0.5 }}>Fechas válidas</Alert>
                )}
                {validation.errors?.map((err, i) => (
                  <Alert key={i} severity="error" sx={{ py: 0.5 }}>{err}</Alert>
                ))}
                {validation.warnings?.map((warn, i) => (
                  <Alert key={i} severity="warning" sx={{ py: 0.5 }}>{warn}</Alert>
                ))}
              </Box>
            )}
          </Paper>

          {/* Calendario / contexto del equipo */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Calendario / contexto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vista del equipo (solo si permitido)
            </Typography>
            {/* Aquí puedes integrar un mini-calendario de ausencias del equipo */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}