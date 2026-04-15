import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, CircularProgress,
  IconButton, Tooltip, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, Paper, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete, GroupAdd } from '@mui/icons-material';
import { getPolicies, createPolicy, updatePolicy, deletePolicy, bulkAssignBalances } from '../../../services/vacationsService';
import { ConfirmDialog, LoadingSpinner } from '../../../components/ui';
import { useTranslation } from 'react-i18next';

const EMPTY_POLICY = {
  name: '',
  year: new Date().getFullYear(),
  accrualType: 'ANNUAL',
  totalDaysPerYear: 22,
  carryOverMaxDays: 5,
};

export function PoliciesTab({ showSnack }) {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_POLICY);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState(null);

  // ── Asignación masiva ────────────────────────────────
  const [bulkPolicy, setBulkPolicy]   = useState(null);
  const [bulkYear, setBulkYear]       = useState(new Date().getFullYear());
  const [bulkSaving, setBulkSaving]   = useState(false);
  
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setRows((data || []).map(p => ({ id: p.policyId, ...p })));
    } catch {
      showSnack('Error cargando políticas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_POLICY);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      year: row.year,
      accrualType: row.accrualType,
      totalDaysPerYear: row.totalDaysPerYear,
      carryOverMaxDays: row.carryOverMaxDays,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await updatePolicy(editing.id, form);
      else         await createPolicy(form);
      showSnack(editing ? t('admin.policies.messages.updatedPolicy') : t('admin.policies.messages.createdPolicy'));
      setDialogOpen(false);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando política', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openBulkAssign = (row) => {
    setBulkPolicy(row);
    setBulkYear(row.year);
  };

  const handleBulkAssign = async () => {
    setBulkSaving(true);
    try {
      const result = await bulkAssignBalances({ policyId: bulkPolicy.id, year: bulkYear });
      showSnack(t('admin.policies.messages.bulkAssigned', { created: result.created, skipped: result.skipped }));
      setBulkPolicy(null);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error en asignación masiva', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePolicy(deleteId);
      showSnack(t('admin.policies.messages.removedPolicy'));
      setDeleteId(null);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'No se puede eliminar', 'error');
      setDeleteId(null);
    }
  };

  const columns = [
    { field: 'name',             headerName: t('admin.policies.columns.name'),        flex: 1 },
    { field: 'year',             headerName: t('admin.policies.columns.year'),           width: 80 },
    { field: 'accrualType',      headerName: t('admin.policies.columns.type'),           width: 110 },
    { field: 'totalDaysPerYear', headerName: t('admin.policies.columns.daysPerYear'),      width: 100 },
    { field: 'carryOverMaxDays', headerName: t('admin.policies.columns.carryOver'),  width: 120 },
    {
      field: 'acciones', headerName: t('common.actions'), width: 150, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title={t('admin.policies.bulkAssign.tooltip')}>
            <IconButton size="small" color="primary" onClick={() => openBulkAssign(row)}>
              <GroupAdd fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          {t('admin.policies.new')}
        </Button>
      </Box>

      <Paper sx={{ height: 450 }}>
        {/* ✅ LoadingSpinner en lugar del Box + CircularProgress manual */}
        {loading
          ? <LoadingSpinner />
          : <DataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[10, 25]}
              disableRowSelectionOnClick
            />
        }
      </Paper>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('admin.policies.form.title_edit') : t('admin.policies.form.title_create')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('admin.policies.form.name')} value={form.name} fullWidth required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label={t('admin.policies.form.year')} type="number" value={form.year} fullWidth required
              onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
            />
            <TextField
              select label={t('admin.policies.form.accrualType')} value={form.accrualType} fullWidth
              onChange={e => setForm(f => ({ ...f, accrualType: e.target.value }))}
            >
              <MenuItem value="ANNUAL">{t('admin.policies.form.annual')}</MenuItem>
              <MenuItem value="MONTHLY">{t('admin.policies.form.monthly')}</MenuItem>
            </TextField>
            <TextField
              label={t('admin.policies.form.daysPerYear')} type="number" value={form.totalDaysPerYear} fullWidth required
              onChange={e => setForm(f => ({ ...f, totalDaysPerYear: +e.target.value }))}
            />
            <TextField
              label={t('admin.policies.form.carryOverMax')} type="number" value={form.carryOverMaxDays} fullWidth required
              onChange={e => setForm(f => ({ ...f, carryOverMaxDays: +e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ ConfirmDialog en lugar del Dialog manual de confirmación */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('admin.policies.delete.title')}
        description={t('admin.policies.delete.description')}
        confirmLabel={t('common.delete')}
        confirmColor="error"
      />

      {/* Dialog asignación masiva */}
      <Dialog open={Boolean(bulkPolicy)} onClose={() => setBulkPolicy(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin.policies.bulkAssign.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">{t('admin.policies.bulkAssign.description')}</Alert>
            <Typography variant="body2">
              <strong>{t('admin.policies.columns.name')}:</strong> {bulkPolicy?.name}
            </Typography>
            <TextField
              label={t('admin.policies.bulkAssign.yearLabel')}
              type="number"
              value={bulkYear}
              fullWidth
              onChange={e => setBulkYear(+e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkPolicy(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleBulkAssign} disabled={bulkSaving}>
            {bulkSaving ? <CircularProgress size={18} /> : t('admin.policies.bulkAssign.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}