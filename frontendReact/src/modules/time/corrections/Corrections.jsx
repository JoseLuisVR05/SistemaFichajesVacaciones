// Corrections.jsx — Container
// Solo orquesta: qué datos mostrar, qué dialogs abrir, qué acciones ejecutar.
// No contiene lógica de renderizado compleja.
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab,
  Button, Snackbar, Alert, Tooltip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRole } from '../../../hooks/useRole';
import { useCorrections } from '../../../hooks/useCorrections';
import { useEmployees } from '../../../hooks/useEmployees';
import { ConfirmDialog } from '../../../components/ui';
import { CorrectionFilters }        from './components/CorrectionFilters';
import { CorrectionTable }          from './components/CorrectionTable';
import { CreateCorrectionDialog }   from './components/CreateCorrectionDialog';
import { EditCorrectionDialog }     from './components/EditCorrectionDialog';
import { RejectCorrectionDialog }   from './components/RejectCorrectionDialog';

export default function Corrections() {
  const { user }  = useAuth();
  const { canManageCorrections, canViewEmployees, isManager } = useRole();
  const location  = useLocation();

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [fromDate, setFromDate]           = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [toDate, setToDate]               = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter]   = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const [editTarget, setEditTarget]   = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  // ── Parámetros del fetch ──────────────────────────────────────────────────
  const correctionParams = {
    from: fromDate,
    to: toDate,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(activeTab === 0 && { includeOwn: true }),
    ...(activeTab === 1 && selectedEmployee && { employeeId: selectedEmployee.employeeId }),
  };

  const { corrections, loading, refetch, create, update, remove, approve, reject } =
    useCorrections(correctionParams);

  const { employees, loading: loadingEmployees } = useEmployees();

  // ── Abrir desde TimeClockPage (incidencia detectada) ──────────────────────
  useEffect(() => {
    if (location.state?.openNew) {
      setCreateOpen(true);
      if (location.state.date) setInitialDate(location.state.date);
    }
  }, [location.state]);

  // ── Cargar empleados al cambiar al tab de gestión ────────────────────────
  useEffect(() => {
    if (activeTab === 1) setSelectedEmployee(null);
  }, [activeTab]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleCreate = async (data) => {
    try {
      await create(data);
      showSnack('Solicitud creada correctamente');
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear', 'error');
      throw err; // para que el dialog no se cierre
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await update(id, data);
      showSnack('Corrección actualizada');
      setEditTarget(null);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al actualizar', 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await remove(deleteTarget.id);
      showSnack('Corrección cancelada', 'info');
      setDeleteTarget(null);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al cancelar', 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approve(id);
      showSnack('Corrección aprobada');
    } catch {
      showSnack('Error al aprobar', 'error');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await reject(id, reason);
      showSnack('Corrección rechazada');
      setRejectTarget(null);
    } catch {
      showSnack('Error al rechazar', 'error');
      throw new Error('reject failed');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box width={140} visibility="hidden">
          <Button variant="contained" startIcon={<Add />}>Nueva</Button>
        </Box>
        <Typography variant="h4">Correcciones de Fichajes</Typography>
        <Tooltip title={activeTab === 1 ? 'Solo puedes solicitar correcciones propias' : ''}>
          <span>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              Nueva solicitud
            </Button>
          </span>
        </Tooltip>
      </Box>

      {canManageCorrections() && (
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 1 }}
        >
          <Tab label="Mis solicitudes" />
          <Tab label="Gestión (equipo)" />
        </Tabs>
      )}

      <CorrectionFilters
        fromDate={fromDate}         onFromDateChange={setFromDate}
        toDate={toDate}             onToDateChange={setToDate}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
        showEmployeeFilter={activeTab === 1 && canViewEmployees()}
        employees={employees}       loadingEmployees={loadingEmployees}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
        isManager={isManager()}
        onSearch={refetch}
        onClearEmployee={() => setSelectedEmployee(null)}
      />

      <Paper sx={{ height: 500 }}>
        <CorrectionTable
          rows={corrections}
          loading={loading}
          mode={activeTab === 1 && canManageCorrections() ? 'management' : 'own'}
          onView={setDetailTarget}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
          onApprove={handleApprove}
          onReject={setRejectTarget}
        />
      </Paper>

      {/* ── Dialogs ── */}
      <CreateCorrectionDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setInitialDate(null); }}
        onSubmit={handleCreate}
        initialDate={initialDate}
      />

      <EditCorrectionDialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        correction={editTarget}
      />

      <RejectCorrectionDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
        correction={rejectTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Cancelar solicitud"
        description={`¿Seguro que deseas cancelar la solicitud del ${
          deleteTarget?.date
            ? new Date(deleteTarget.date).toLocaleDateString('es-ES')
            : ''
        }? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar solicitud"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
