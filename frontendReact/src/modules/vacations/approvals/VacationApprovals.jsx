// src/modules/vacations/approvals/VacationApprovals.jsx
import { useState } from 'react';
import {
  Box, Typography, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert,
} from '@mui/material';
import { useVacationApprovals } from '../../../hooks/useVacationApprovals';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { StatusChip, SnackbarAlert } from '../../../components/ui';
import { ApprovalsFilters } from './components/ApprovalsFilters';
import { ApprovalsTable }  from './components/ApprovalsTable';

export default function VacationApprovals() {
  const {
    rows, loading,
    statusFilter,     setStatusFilter,
    selectedEmployee, setSelectedEmployee,
    fromDate,         setFromDate,
    toDate,           setToDate,
    departmentFilter, setDepartmentFilter,
    employees, loadingEmployees, departments,
    loadData, approve, reject,
  } = useVacationApprovals();

  const { snackbar, showSnack, closeSnack } = useSnackbar();

  // ── Estado de UI ───────────────────────────────────────
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [selectedRow, setSelectedRow]     = useState(null);
  const [detailOpen, setDetailOpen]       = useState(false);

  // ── Handlers ───────────────────────────────────────────
  const handleApprove = async (requestId) => {
    try {
      await approve(requestId);
      showSnack('Solicitud aprobada correctamente');
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al aprobar', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      showSnack('El motivo del rechazo es obligatorio', 'warning');
      return;
    }
    try {
      await reject(selectedRow.id, rejectComment.trim());
      showSnack('Solicitud rechazada', 'info');
      setRejectOpen(false);
      setRejectComment('');
      setSelectedRow(null);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al rechazar', 'error');
    }
  };

  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Bandeja de Aprobaciones
      </Typography>

      <ApprovalsFilters
        statusFilter={statusFilter}         onStatusFilterChange={setStatusFilter}
        selectedEmployee={selectedEmployee} onEmployeeChange={setSelectedEmployee}
        fromDate={fromDate}                 onFromDateChange={setFromDate}
        toDate={toDate}                     onToDateChange={setToDate}
        departmentFilter={departmentFilter} onDepartmentFilterChange={setDepartmentFilter}
        employees={employees}
        loadingEmployees={loadingEmployees}
        departments={departments}
        onSearch={loadData}
      />

      <Paper sx={{ height: 500 }}>
        <ApprovalsTable
          rows={rows}
          loading={loading}
          onView={(row) => { setSelectedRow(row); setDetailOpen(true); }}
          onApprove={handleApprove}
          onReject={(row) => { setSelectedRow(row); setRejectOpen(true); }}
        />
      </Paper>

      {/* Dialog: Rechazar */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <TextField
            label="Motivo del rechazo" value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            multiline rows={3} required fullWidth autoFocus sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRejectOpen(false); setRejectComment(''); }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            Confirmar rechazo
          </Button>
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
              <Typography component="div">
                <strong>Estado:</strong>{' '}
                <StatusChip status={selectedRow.status} />
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

      <SnackbarAlert {...snackbar} onClose={closeSnack} />
    </Box>
  );
}