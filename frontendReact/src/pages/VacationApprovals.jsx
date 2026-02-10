import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Button,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Snackbar, IconButton, Tooltip, MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import {
  getVacationRequests, approveVacationRequest, rejectVacationRequest
} from '../services/vacationsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Pendiente', color: 'warning' },
  APPROVED:  { label: 'Aprobada',  color: 'success' },
  REJECTED:  { label: 'Rechazada', color: 'error' },
};

/**
 * VacationApprovals - Bandeja de aprobaciones para MANAGER/RRHH/ADMIN
 * 
 * Muestra solicitudes en estado SUBMITTED que requieren decisión.
 * Permite:
 * - Aprobar: cambia estado a APPROVED, actualiza saldo, sincroniza calendario
 * - Rechazar: cambia estado a REJECTED, requiere motivo obligatorio
 * - Ver detalle de cada solicitud
 * 
 * Solo accesible por ADMIN, RRHH y MANAGER (protegido por ProtectedRoute en App.jsx)
 */
export default function VacationApprovals() {
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED'); // Por defecto: pendientes

  // Diálogo de rechazo
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  // Diálogo de detalle
  const [detailOpen, setDetailOpen] = useState(false);

  // Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Carga de datos ───────────────────────────────────
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
          ? format(new Date(r.startDate), 'dd/MM/yyyy', { locale: es }) : '-',
        endFormatted: r.endDate
          ? format(new Date(r.endDate), 'dd/MM/yyyy', { locale: es }) : '-',
        createdFormatted: r.createdAt
          ? format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
      }));
      setRows(formatted);
    } catch (err) {
      console.error('Error cargando aprobaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Aprobar ──────────────────────────────────────────
  const handleApprove = async (requestId) => {
    try {
      await approveVacationRequest(requestId);
      setSnackbar({ open: true, message: 'Solicitud aprobada correctamente', severity: 'success' });
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al aprobar',
        severity: 'error'
      });
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
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al rechazar',
        severity: 'error'
      });
    }
  };

  // ─── Columnas ─────────────────────────────────────────
  const columns = [
    { field: 'employeeName', headerName: 'Empleado', width: 180 },
    { field: 'startFormatted', headerName: 'Desde', width: 110 },
    { field: 'endFormatted', headerName: 'Hasta', width: 110 },
    { field: 'requestedDays', headerName: 'Días', width: 80 },
    {
      field: 'type', headerName: 'Tipo', width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'VACATION' ? 'Vacaciones' : value}
          size="small" variant="outlined"
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
    { field: 'createdFormatted', headerName: 'Solicitado', width: 150 },
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
                  setSelectedRow(row);
                  setRejectOpen(true);
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

      {/* Filtro */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select label="Estado" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small" sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          <MenuItem value="SUBMITTED">Pendientes</MenuItem>
          <MenuItem value="APPROVED">Aprobadas</MenuItem>
          <MenuItem value="REJECTED">Rechazadas</MenuItem>
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
            pageSizeOptions={[10, 25]}
            disableRowSelectionOnClick
          />
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
          <TextField
            label="Motivo del rechazo" value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            multiline rows={3} required fullWidth autoFocus
          />
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
              <Typography>
                <strong>Estado:</strong>{' '}
                <Chip
                  label={STATUS_CONFIG[selectedRow.status]?.label}
                  color={STATUS_CONFIG[selectedRow.status]?.color}
                  size="small"
                />
              </Typography>
              {selectedRow.approverComment && (
                <Alert severity="info">
                  <strong>Comentario:</strong> {selectedRow.approverComment}
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