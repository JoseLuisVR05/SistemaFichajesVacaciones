import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, CircularProgress,
  IconButton, Tooltip, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, Paper
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from '../../../services/vacationsService';
import { ConfirmDialog, LoadingSpinner } from '../../../components/ui';

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
      showSnack(editing ? 'Política actualizada' : 'Política creada');
      setDialogOpen(false);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando política', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePolicy(deleteId);
      showSnack('Política eliminada');
      setDeleteId(null);
      load();
    } catch (err) {
      showSnack(err.response?.data?.message || 'No se puede eliminar', 'error');
      setDeleteId(null);
    }
  };

  const columns = [
    { field: 'name',             headerName: 'Nombre',        flex: 1 },
    { field: 'year',             headerName: 'Año',           width: 80 },
    { field: 'accrualType',      headerName: 'Tipo',          width: 110 },
    { field: 'totalDaysPerYear', headerName: 'Días/Año',      width: 100 },
    { field: 'carryOverMaxDays', headerName: 'Arrastre máx',  width: 120 },
    {
      field: 'acciones', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
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
          Nueva Política
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
        <DialogTitle>{editing ? 'Editar Política' : 'Nueva Política'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre" value={form.name} fullWidth required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Año" type="number" value={form.year} fullWidth required
              onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
            />
            <TextField
              select label="Tipo devengo" value={form.accrualType} fullWidth
              onChange={e => setForm(f => ({ ...f, accrualType: e.target.value }))}
            >
              <MenuItem value="ANNUAL">Anual</MenuItem>
              <MenuItem value="MONTHLY">Mensual</MenuItem>
            </TextField>
            <TextField
              label="Días por año" type="number" value={form.totalDaysPerYear} fullWidth required
              onChange={e => setForm(f => ({ ...f, totalDaysPerYear: +e.target.value }))}
            />
            <TextField
              label="Días de arrastre máx." type="number" value={form.carryOverMaxDays} fullWidth required
              onChange={e => setForm(f => ({ ...f, carryOverMaxDays: +e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ ConfirmDialog en lugar del Dialog manual de confirmación */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirmar eliminación"
        description="¿Seguro que deseas eliminar esta política? No podrá recuperarse."
        confirmLabel="Eliminar"
        confirmColor="error"
      />
    </>
  );
}