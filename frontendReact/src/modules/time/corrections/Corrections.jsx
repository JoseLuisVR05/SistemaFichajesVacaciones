// Corrections.jsx — Container
// Solo orquesta: qué datos mostrar, qué dialogs abrir, qué acciones ejecutar.
// No contiene lógica de renderizado compleja.
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab,
  Button, Tooltip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRole } from '../../../hooks/useRole';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useCorrections } from '../../../hooks/useCorrections';
import { useEmployees } from '../../../hooks/useEmployees';
import { ConfirmDialog  } from '../../../components/ui';
import { CorrectionFilters }        from './components/CorrectionFilters';
import { CorrectionTable }          from './components/CorrectionTable';
import { CreateCorrectionDialog }   from './components/CreateCorrectionDialog';
import { EditCorrectionDialog }     from './components/EditCorrectionDialog';
import { RejectCorrectionDialog }   from './components/RejectCorrectionDialog';
import { SnackbarAlert }           from '../../../components/ui/SnackbarAlert/SnackbarAlert';
import { useTranslation } from 'react-i18next';
import { useDialogState } from '../../../hooks/useDialogState';
import { CorrectionDetailDialog } from './components/CorrectionDetailDialog';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { mapCorrectionError } from '../../../utils/helpers/backendErrors';

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

  const { t, i18n } = useTranslation();

  const [initialDate, setInitialDate] = useState(null);
  const { dialogs, setDialog } = useDialogState();

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
      setDialog('create', true);
      if (location.state.date) setInitialDate(location.state.date);
    }
  }, [location.state]);

  // ── Cargar empleados al cambiar al tab de gestión ────────────────────────
  useEffect(() => {
    if (activeTab === 1) setSelectedEmployee(null);
  }, [activeTab]);

   // ── Acciones ──────────────────────────────────────────────────────────────
  const executeAction = async (action, messageKey, onSuccess, shouldThrow = false) => {
    try {
      await action();
      showSnack(t(`corrections.messages.${messageKey}`));
      onSuccess?.();
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      const mappedMessage = backendMessage
        ? mapCorrectionError(backendMessage, t)
        : t(`corrections.messages.error${messageKey}`);

      showSnack(mappedMessage, 'error');

      if (shouldThrow) throw err;
    }
  };

  const handleCreate = (data) => 
    executeAction(() => create(data), 'created', null, true);

  const handleEdit = (id, data) =>
    executeAction(() => update(id, data), 'updated', () => setDialog('edit', null));

  const handleDelete = () =>
    executeAction(() => remove(dialogs.delete.id), 'cancelled', () => setDialog('delete', null));

  const handleApprove = (id) =>
    executeAction(() => approve(id), 'approved');

  const handleReject = (id, reason) =>
    executeAction(() => reject(id, reason), 'rejected', () => setDialog('reject', null));
 
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
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog('create', true)}>
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
          onView={(row) => setDialog('detail', row)}
          onEdit={(row) => setDialog('edit', row)}
          onDelete={(row) => setDialog('delete', row)}
          onApprove={handleApprove}
          onReject={(row) => setDialog('reject', row)}
        />
      </Paper>

      {/* ── Dialogs ── */}
      <CreateCorrectionDialog
        open={dialogs.create}
        onClose={() => { setDialog('create', false); setInitialDate(null); }}
        onSubmit={handleCreate}
        initialDate={initialDate}
      />

      <EditCorrectionDialog
        open={Boolean(dialogs.edit)}
        onClose={() => setDialog('edit', null)}
        onSubmit={handleEdit}
        correction={dialogs.edit}
      />

      <RejectCorrectionDialog
        open={Boolean(dialogs.reject)}
        onClose={() => setDialog('reject', null)}
        onSubmit={handleReject}
        correction={dialogs.reject}
      />

      <ConfirmDialog
        open={Boolean(dialogs.delete)}
        onClose={() => setDialog('delete', null)}
        onConfirm={handleDelete}
        title={t('corrections.delete.title')}
        description={t('corrections.delete.description', {
        date: dialogs.delete?.date
          ? format(toLocalDate(dialogs.delete.date), 'dd/MM/yyyy')
          : ''
        })} 
        confirmLabel={t('corrections.delete.confirm')}
        confirmColor="error"
      />

      <CorrectionDetailDialog
        open={Boolean(dialogs.detail)}
        correction={dialogs.detail}
        onClose={() => setDialog('detail', null)}
      />
      <SnackbarAlert {...snackbar} onClose={closeSnack} />
    </Box>
  );
}
