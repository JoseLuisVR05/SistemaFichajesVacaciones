import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, TextField, Button,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, IconButton, Tooltip, MenuItem, Card, CardContent,
  Grid, Divider, Tabs, Tab
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add, Send, Cancel, Visibility, AccountBalanceWallet,
  EventBusy, EventAvailable, History
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import {
  getVacationRequests, createVacationRequest, submitVacationRequest,
  cancelVacationRequest, validateVacationDates, getBalance
} from '../../../services/vacationsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';

const STATUS_CONFIG = {
  DRAFT:     { label: 'Borrador',  color: 'default' },
  SUBMITTED: { label: 'Enviada',   color: 'info' },
  APPROVED:  { label: 'Aprobada',  color: 'success' },
  REJECTED:  { label: 'Rechazada', color: 'error' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
};

export default function VacationRequests() {
  const { user } = useAuth();

  // ── Tabs ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Saldo ─────────────────────────────────────────────
  const [myBalance, setMyBalance] = useState(null);

  // ── Historial ─────────────────────────────────────────
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailOpen, setDetailOpen]     = useState(false);
  const [selectedRow, setSelectedRow]   = useState(null);

  // ── Formulario nueva solicitud ─────────────────────────
  const [newRequest, setNewRequest] = useState({
    startDate: '', endDate: '', type: 'VACATION', comment: ''
  });
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating]     = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // ── Efectos ───────────────────────────────────────────
  useEffect(() => { loadBalance(); }, []);

  const loadBalance = async () => {
    try {
      setMyBalance(await getBalance({ year: new Date().getFullYear() }));
    } catch { /* no balance configurado aún */ }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {employeeId: user?.employeeId};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await getVacationRequests(params);
      setRows((data || []).map(r => ({
        id: r.requestId,
        ...r,
        startFormatted: r.startDate ? format(toLocalDate(r.startDate), 'dd/MM/yyyy', { locale: es }) : '-',
        endFormatted:   r.endDate   ? format(toLocalDate(r.endDate),   'dd/MM/yyyy', { locale: es }) : '-',
      })));
    } catch { showSnack('Error cargando solicitudes', 'error'); }
    finally { setLoading(false); }
  }, [statusFilter, user?.employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Validación automática de fechas ───────────────────
  useEffect(() => {
    if (!newRequest.startDate || !newRequest.endDate) return;
    const timer = setTimeout(async () => {
      setValidating(true);
      setValidation(null);
      try {
        setValidation(await validateVacationDates(newRequest.startDate, newRequest.endDate));
      } catch {
        setValidation({ isValid: false, errors: ['Error al validar las fechas.'], warnings: [], workingDays: 0, availableDays: 0 });
      } finally { setValidating(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [newRequest.startDate, newRequest.endDate]);

  // ── Acciones ─────────────────────────────────────────
  const handleCreate = async (autoSubmit = false) => {
    if (!validation?.isValid) return;
    setCreating(true);
    try {
      const result = await createVacationRequest({
        startDate: newRequest.startDate, endDate: newRequest.endDate,
        type: newRequest.type, comment: newRequest.comment
      });
      if (autoSubmit && result?.requestId) {
        try {
          await submitVacationRequest(result.requestId);
          showSnack(`Solicitud enviada para aprobación (${result.requestedDays} días)`);
        } catch {
          showSnack(`Guardada como borrador (${result.requestedDays} días). Error al enviar.`, 'warning');
        }
      } else {
        showSnack(`Borrador guardado (${result.requestedDays} días). Recuerda enviarlo.`, 'info');
      }
      setNewRequest({ startDate: '', endDate: '', type: 'VACATION', comment: '' });
      setValidation(null);
      setActiveTab(1); // Ir al historial
      loadData();
      loadBalance();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear la solicitud', 'error');
    } finally { setCreating(false); }
  };

  const handleSubmit = async (requestId) => {
    try {
      await submitVacationRequest(requestId);
      showSnack('Solicitud enviada para aprobación');
      loadData();
    } catch (err) { showSnack(err.response?.data?.message || 'Error al enviar', 'error'); }
  };

  const handleCancel = async (requestId) => {
    try {
      await cancelVacationRequest(requestId);
      showSnack('Solicitud cancelada', 'info');
      loadData();
      loadBalance();
    } catch (err) { showSnack(err.response?.data?.message || 'Error al cancelar', 'error'); }
  };

  // ── Columnas del historial ────────────────────────────
  const columns = [
    { field: 'startFormatted', headerName: 'Desde',  width: 110 },
    { field: 'endFormatted',   headerName: 'Hasta',  width: 110 },
    { field: 'requestedDays',  headerName: 'Días',   width: 70, type: 'number' },
    {
      field: 'type', headerName: 'Tipo', width: 130,
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
      field: 'acciones', headerName: 'Acciones', width: 150, sortable: false,
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

  // ── Render ────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Vacaciones
      </Typography>

      {/* ── Tarjetas de saldo ── */}
      {myBalance && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Asignados',  value: myBalance.allocatedDays,  icon: <AccountBalanceWallet color="primary" />, bg: '#f5f5f5' },
            { label: 'Usados',     value: myBalance.usedDays,        icon: <EventBusy color="error" />,            bg: '#fff3f0' },
            { label: 'Restantes',  value: myBalance.remainingDays,   icon: <EventAvailable color="success" />,     bg: '#f0faf0' },
          ].map(({ label, value, icon, bg }) => (
            <Grid item xs={12} sm={4} size={4} key={label}>
              <Card sx={{ bgcolor: bg }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {icon}
                  <Box>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h5" fontWeight="700">{value} días</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Tabs ── */}
      <Paper sx={{ px: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Add />} iconPosition="start" label="Nueva solicitud" />
          <Tab icon={<History />} iconPosition="start" label="Mis solicitudes" />
        </Tabs>
      </Paper>

      {/* ══ TAB 0 — Formulario nueva solicitud ══ */}
      {activeTab === 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Formulario */}
          <Grid item xs={12} md={7} size={7}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom textAlign="center">
                Nueva solicitud
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Fecha inicio" type="date" value={newRequest.startDate}
                  onChange={e => setNewRequest(r => ({ ...r, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }} fullWidth />
                <TextField label="Fecha fin" type="date" value={newRequest.endDate}
                  onChange={e => setNewRequest(r => ({ ...r, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }} fullWidth />
                <TextField select label="Tipo" value={newRequest.type}
                  onChange={e => setNewRequest(r => ({ ...r, type: e.target.value }))} fullWidth>
                  <MenuItem value="VACATION">Vacaciones</MenuItem>
                  <MenuItem value="PERSONAL">Asuntos personales</MenuItem>
                  <MenuItem value="OTHER">Otro</MenuItem>
                </TextField>
                <TextField label="Comentario (opcional)" value={newRequest.comment}
                  onChange={e => setNewRequest(r => ({ ...r, comment: e.target.value }))}
                  multiline rows={3} fullWidth placeholder="Ej: Viaje familiar..." />
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
                  <Button onClick={() => { setNewRequest({ startDate: '', endDate: '', type: 'VACATION', comment: '' }); setValidation(null); }}>
                    Cancelar
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Cálculo automático */}
          <Grid item xs={12} md={5} size={5}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Cálculo automático
              </Typography>
              {validating && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
              {!validation && !validating && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Selecciona las fechas para ver el cálculo.
                </Typography>
              )}
              {validation && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Días laborables solicitados:</Typography>
                    <Typography variant="body2" fontWeight="600">{validation.workingDays}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Días disponibles:</Typography>
                    <Typography variant="body2" fontWeight="600">{validation.availableDays}</Typography>
                  </Box>
                  <Divider />
                  {validation.isValid && <Alert severity="success" sx={{ py: 0.5 }}>Fechas válidas ✓</Alert>}
                  {validation.errors?.map((err, i) => <Alert key={i} severity="error" sx={{ py: 0.5 }}>{err}</Alert>)}
                  {validation.warnings?.map((w, i) => <Alert key={i} severity="warning" sx={{ py: 0.5 }}>{w}</Alert>)}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ══ TAB 1 — Historial de solicitudes ══ */}
      {activeTab === 1 && (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" gap={2} alignItems="center">
              <TextField select label="Estado" value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="DRAFT">Borrador</MenuItem>
                <MenuItem value="SUBMITTED">Enviada</MenuItem>
                <MenuItem value="APPROVED">Aprobada</MenuItem>
                <MenuItem value="REJECTED">Rechazada</MenuItem>
                <MenuItem value="CANCELLED">Cancelada</MenuItem>
              </TextField>
              <Button variant="contained" onClick={loadData} size="small">Filtrar</Button>
            </Box>
          </Paper>
          <Paper sx={{ height: 500 }}>
            {loading
              ? <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
              : <DataGrid rows={rows} columns={columns}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  pageSizeOptions={[10, 25]} disableRowSelectionOnClick />
            }
          </Paper>
        </>
      )}

      {/* Dialog detalle */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de solicitud</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Desde:</strong> {selectedRow.startFormatted}</Typography>
              <Typography><strong>Hasta:</strong> {selectedRow.endFormatted}</Typography>
              <Typography><strong>Días laborables:</strong> {selectedRow.requestedDays}</Typography>
              <Typography><strong>Tipo:</strong> {selectedRow.type}</Typography>
              <Typography component="div"><strong>Estado:</strong>{' '}
                <Chip label={STATUS_CONFIG[selectedRow.status]?.label} color={STATUS_CONFIG[selectedRow.status]?.color} size="small" />
              </Typography>
              {selectedRow.approverComment && (
                <Alert severity={selectedRow.status === 'APPROVED' ? 'success' : 'info'}>
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