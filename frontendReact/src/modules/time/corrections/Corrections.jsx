// Corrections.jsx — Container
// Solo orquesta: qué datos mostrar, qué dialogs abrir, qué acciones ejecutar.
// No contiene lógica de renderizado compleja.
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab,
  Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRole } from '../../../hooks/useRole';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useCorrections } from '../../../hooks/useCorrections';
import { useEmployees } from '../../../hooks/useEmployees';
import { ConfirmDialog, StatusChip  } from '../../../components/ui';
import { CorrectionFilters }        from './components/CorrectionFilters';
import { CorrectionTable }          from './components/CorrectionTable';
import { CreateCorrectionDialog }   from './components/CreateCorrectionDialog';
import { EditCorrectionDialog }     from './components/EditCorrectionDialog';
import { RejectCorrectionDialog }   from './components/RejectCorrectionDialog';
import { SnackbarAlert }           from '../../../components/ui/SnackbarAlert/SnackbarAlert';
import { useTranslation } from 'react-i18next';
import { formatCorrectionReason } from '../../../utils/helpers/formatCorrections';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { es } from 'date-fns/locale'; 

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

  // traducción

  const { t } = useTranslation();

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const [editTarget, setEditTarget]   = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  
  const { snackbar, showSnack, closeSnack } = useSnackbar();

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
      showSnack(t('corrections.messages.created'));
    } catch (err) {
      showSnack(err.response?.data?.message || t('corrections.messages.errorCreate'), 'error');
      showSnack(err.response?.data?.message || t('corrections.messages.submitError'), 'error');
      throw err; // para que el dialog no se cierre
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await update(id, data);
      showSnack(t('corrections.messages.updated'));
      setEditTarget(null);
    } catch (err) {
      showSnack(err.response?.data?.message || t('corrections.messages.errorUpdate'), 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await remove(deleteTarget.id);
      showSnack(t('corrections.messages.cancelled'), 'info');
      setDeleteTarget(null);
    } catch (err) {
      showSnack(err.response?.data?.message || t('corrections.messages.errorCancel'), 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approve(id);
      showSnack(t('corrections.messages.approved'));
    } catch (err) {
      showSnack(err.response?.data?.message || t('corrections.messages.errorApprove'), 'error');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await reject(id, reason);
      showSnack(t('corrections.messages.rejected'));
      setRejectTarget(null);
    } catch {
      showSnack(t('corrections.messages.errorReject'), 'error');  
      throw new Error('reject failed');
    }
  };
 
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box width={140} visibility="hidden">
          <Button variant="contained" startIcon={<Add />}>{t('corrections.newRequest')}</Button>
        </Box>
        <Typography variant="h4">{t('corrections.title')}</Typography>
        <Tooltip title={activeTab === 1 ? t('corrections.tooltip.ownOnly') : ''}>
          <span>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              {t('corrections.newRequest')}
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
          <Tab label={t('corrections.tabs.mine')} />
          <Tab label={t('corrections.tabs.management')} />
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
        title={t('corrections.delete.title')}
        description={t('corrections.delete.description', {
        date: deleteTarget?.date
          ? format(toLocalDate(deleteTarget.date), 'dd/MM/yyyy', { locale: es })
          : ''
        })} 
        confirmLabel={t('corrections.delete.confirm')}
        confirmColor="error"
      />

      {/* ── Diálogo de detalle ── */}
      <Dialog
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('corrections.detail.title')}</DialogTitle>
        <DialogContent>
          {detailTarget && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography>
                <strong>{t('corrections.columns.date')}:</strong>{' '}
                {detailTarget.date
                  ? format(toLocalDate(detailTarget.date), 'dd/MM/yyyy', { locale: es })
                  : '-'}
              </Typography>
              <Typography>
                <strong>{t('corrections.columns.originalMinutes')}:</strong>{' '}
                {detailTarget.originalMinutes != null
                  ? `${Math.floor(Math.abs(detailTarget.originalMinutes) / 60)}h ${Math.abs(detailTarget.originalMinutes) % 60}m`
                  : '-'}
              </Typography>
              <Typography>
                <strong>{t('corrections.columns.correctedMinutes')}:</strong>{' '}
                {detailTarget.correctedMinutes != null
                  ? `${Math.floor(Math.abs(detailTarget.correctedMinutes) / 60)}h ${Math.abs(detailTarget.correctedMinutes) % 60}m`
                  : '-'}
              </Typography>
              <Typography>
                <strong>{t('corrections.columns.reason')}:</strong>{' '}
                  {formatCorrectionReason(detailTarget.reason, t)}
              </Typography>
              <Typography component="div">
                <strong>{t('common.statusLabel')}:</strong>{' '}
                <StatusChip status={detailTarget.status} />
              </Typography>
                {detailTarget.employeeName && (
                <Typography>
                  <strong>{t('corrections.columns.employee')}:</strong>{' '}
                  {detailTarget.employeeName}
                </Typography>
              )}
              <Typography>
                <strong>{t('corrections.columns.created')}:</strong>{' '}
                {detailTarget.createdAt
                  ? new Date(detailTarget.createdAt + (detailTarget.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString()
                  : '-'}
              </Typography>
              {detailTarget.rejectionReason && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <strong>{t('corrections.detail.rejectionReason')}:</strong>{' '}
                  {detailTarget.rejectionReason}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailTarget(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <SnackbarAlert {...snackbar} onClose={closeSnack} />
    </Box>
  );
}
