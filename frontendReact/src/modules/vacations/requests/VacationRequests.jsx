// src/modules/vacations/requests/VacationRequests.jsx

// ─── Imports de React ──────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Imports de MUI ───────────────────────────────────────────────────────
import {
  Box, Typography, Paper, Button,
  Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert,
} from '@mui/material';
import { Add, History } from '@mui/icons-material';

// ─── Imports propios ───────────────────────────────────────────────────────
import { useAuth } from '../../../context/AuthContext';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useVacationRequests, useVacationBalance } from '../../../hooks/useVacations';
import { validateVacationDates } from '../../../services/vacationsService';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { format } from 'date-fns';
import { StatusChip, SnackbarAlert } from '../../../components/ui';


// ─── Subcomponentes ────────────────────────────────────────────────────────
import { BalanceCards }   from './components/BalanceCards';
import { RequestForm }    from './components/RequestForm';
import { RequestsTable }  from './components/RequestsTable';

// Estado inicial del formulario — fuera del componente para no recrearse
const EMPTY_FORM = { startDate: '', endDate: '', type: 'VACATION', comment: '' };

export default function VacationRequests() {
  const { user } = useAuth();
  const { snackbar, showSnack, closeSnack } = useSnackbar();
  const { t } = useTranslation();

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Datos: hook de solicitudes y saldo ────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [holidays, setHolidays] = useState([]);

  const {
    requests: rows,
    loading,
    refetch,
    submit,
    cancel,
    create,
  } = useVacationRequests({ employeeId: user?.employeeId, status: statusFilter !== 'ALL' ? statusFilter : undefined });

  const { balance, refetch: refetchBalance } = useVacationBalance(new Date().getFullYear());

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [form, setForm]             = useState(EMPTY_FORM);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating]     = useState(false);

  // ── Dialog de detalle ──────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // ── Validación automática al cambiar fechas ───────────────────────────────
  useEffect(() => {
    if (!form.startDate || !form.endDate) return;
    const timer = setTimeout(async () => {
      setValidating(true);
      setValidation(null);
      try {
        const result = await validateVacationDates(form.startDate, form.endDate);
        setValidation(result);
        // Extraer festivos del resultado
        if (result.holidays && result.holidays.length > 0) {
          setHolidays(result.holidays);
        } else {
          setHolidays([]);
        }
      } catch {
        setValidation({
          isValid: false,
          errors: [t('vacations.messages.errorValidateDates')],
          warnings: [],
          workingDays: 0,
          availableDays: 0,
        });
        setHolidays([]);
      } finally {
        setValidating(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.startDate, form.endDate]);

  // ── Acciones del formulario ───────────────────────────────────────────────
  const handleCreate = async (autoSubmit = false) => {
    if (!validation?.isValid) return;
    setCreating(true);
    try {
      const result = await create({
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        comment: form.comment,
      });
      if (autoSubmit && result?.requestId) {
        try {
          await submit(result.requestId);
          showSnack(t('vacations.messages.submitted', { days: result.requestedDays }));
        } catch {
          showSnack(t('vacations.messages.submitError'), 'warning');
        }
      } else {
        showSnack(t('vacations.messages.draftSaved', { days: result.requestedDays }), 'info');
      }
      setForm(EMPTY_FORM);
      setValidation(null);
      refetchBalance();
      setActiveTab(1);
    } catch (err) {
      showSnack(err.response?.data?.message || t('vacations.messages.errorCreate'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (requestId) => {
    try {
      await submit(requestId);
      showSnack(t('vacations.messages.submittedForApproval'));
    } catch (err) {
      showSnack(err.response?.data?.message || t('vacations.messages.errorSubmit'), 'error');
    }
  };
  

  const handleCancel = async (requestId) => {
    try {
      await cancel(requestId);
      showSnack(t('vacations.messages.requestCancel'), 'info');
      refetchBalance();
    } catch (err) {
      showSnack(err.response?.data?.message || t('vacations.messages.errorCancel'), 'error');
    }
  };

  // Formatear filas para la tabla
  const formattedRows = rows.map(r => ({
    id: r.requestId,
    ...r,
    startFormatted: r.startDate
      ? format(toLocalDate(r.startDate), 'dd/MM/yyyy')
      : '-',
    endFormatted: r.endDate
      ? format(toLocalDate(r.endDate), 'dd/MM/yyyy')
      : '-',
  }));


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        {t('vacations.title')}
      </Typography>

      {/* Tarjetas de saldo */}
      <BalanceCards balance={balance} />

      {/* Tabs */}
      <Paper sx={{ px: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Add />} iconPosition="start" label={t('vacations.tabs.new')} />
          <Tab icon={<History />} iconPosition="start" label={t('vacations.tabs.history')} />
        </Tabs>
      </Paper>

      {/* Tab 0 — Formulario */}
      {activeTab === 0 && (
        <RequestForm
          form={form}
          onFormChange={setForm}
          validation={validation}
          validating={validating}
          creating={creating}
          onSubmit={() => handleCreate(true)}
          onSaveDraft={() => handleCreate(false)}
          onCancel={() => { setForm(EMPTY_FORM); setValidation(null); }}
          holidaysList={holidays}
        />
      )}

      {/* Tab 1 — Historial */}
      {activeTab === 1 && (
        <RequestsTable
          rows={formattedRows}
          loading={loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSearch={refetch}
          onView={(row) => { setSelectedRow(row); setDetailOpen(true); }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      {/* Dialog de detalle */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('vacations.approvals.detail')}</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>{t('vacations.form.startDate')}:</strong> {selectedRow.startFormatted}</Typography>
              <Typography><strong>{t('vacations.form.endDate')}:</strong> {selectedRow.endFormatted}</Typography>
              <Typography><strong>{t('vacations.table.days')}:</strong> {selectedRow.requestedDays}</Typography>
              <Typography><strong>{t('vacations.form.type')}:</strong> {selectedRow.type}</Typography>
              <Typography component="div">
                <strong>{t('common.statusLabel')}:</strong>{' '}
                <StatusChip status={selectedRow.status} />
              </Typography>
              {selectedRow.approverComment && (
                <Alert severity={selectedRow.status === 'APPROVED' ? 'success' : 'info'}>
                  <strong>{t('vacations.approvals.columns.comment')}</strong> {selectedRow.approverComment}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <SnackbarAlert {...snackbar} onClose={closeSnack} />
    </Box>
  );
}