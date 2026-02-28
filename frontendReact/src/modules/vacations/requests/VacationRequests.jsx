// src/modules/vacations/requests/VacationRequests.jsx

// ─── Imports de React ──────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';

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
import { es } from 'date-fns/locale';
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

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Datos: hook de solicitudes y saldo ────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('ALL');

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
        setValidation(await validateVacationDates(form.startDate, form.endDate));
      } catch {
        setValidation({
          isValid: false,
          errors: ['Error al validar las fechas.'],
          warnings: [],
          workingDays: 0,
          availableDays: 0,
        });
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
          showSnack(`Solicitud enviada para aprobación (${result.requestedDays} días)`);
        } catch {
          showSnack(`Guardada como borrador. Error al enviar.`, 'warning');
        }
      } else {
        showSnack(`Borrador guardado (${result.requestedDays} días). Recuerda enviarlo.`, 'info');
      }
      setForm(EMPTY_FORM);
      setValidation(null);
      refetchBalance();
      setActiveTab(1);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear la solicitud', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (requestId) => {
    try {
      await submit(requestId);
      showSnack('Solicitud enviada para aprobación');
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al enviar', 'error');
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await cancel(requestId);
      showSnack('Solicitud cancelada', 'info');
      refetchBalance();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al cancelar', 'error');
    }
  };

  // Formatear filas para la tabla
  const formattedRows = rows.map(r => ({
    id: r.requestId,
    ...r,
    startFormatted: r.startDate
      ? format(toLocalDate(r.startDate), 'dd/MM/yyyy', { locale: es })
      : '-',
    endFormatted: r.endDate
      ? format(toLocalDate(r.endDate), 'dd/MM/yyyy', { locale: es })
      : '-',
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Vacaciones
      </Typography>

      {/* Tarjetas de saldo */}
      <BalanceCards balance={balance} />

      {/* Tabs */}
      <Paper sx={{ px: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Add />} iconPosition="start" label="Nueva solicitud" />
          <Tab icon={<History />} iconPosition="start" label="Mis solicitudes" />
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
        <DialogTitle>Detalle de solicitud</DialogTitle>
        <DialogContent>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Desde:</strong> {selectedRow.startFormatted}</Typography>
              <Typography><strong>Hasta:</strong> {selectedRow.endFormatted}</Typography>
              <Typography><strong>Días laborables:</strong> {selectedRow.requestedDays}</Typography>
              <Typography><strong>Tipo:</strong> {selectedRow.type}</Typography>
              <Typography component="div">
                <strong>Estado:</strong>{' '}
                <StatusChip status={selectedRow.status} />
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

      <SnackbarAlert {...snackbar} onClose={closeSnack} />
    </Box>
  );
}