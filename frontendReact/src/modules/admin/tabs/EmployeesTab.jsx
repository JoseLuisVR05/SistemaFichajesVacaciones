import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, Paper,
  IconButton, Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Refresh } from '@mui/icons-material';
import { getEmployees, toggleEmployeeActive } from '../../../services/employeesService';
import { StatusChip, LoadingSpinner } from '../../../components/ui';
import { useTranslation } from 'react-i18next';
import { common } from '@mui/material/colors';

export function EmployeesTab({ showSnack }) {
  const [rows, setRows]       = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const { t } = useTranslation();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      const formatted = (data || []).map(e => ({ id: e.employeeId, ...e }));
      setAllRows(formatted);
      setRows(formatted);
    } catch {
      showSnack('Error cargando empleados', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    if (!search.trim()) { setRows(allRows); return; }
    const lc = search.toLowerCase();
    setRows(allRows.filter(e =>
      e.fullName?.toLowerCase().includes(lc) ||
      e.employeeCode?.toLowerCase().includes(lc) ||
      e.department?.toLowerCase().includes(lc)
    ));
  };

  const handleToggle = async (id) => {
    try {
      const result = await toggleEmployeeActive(id);
      showSnack(result.message);
      const update = (prev) =>
        prev.map(r => r.id === id ? { ...r, isActive: result.isActive } : r);
      setRows(update);
      setAllRows(update);
    } catch {
      showSnack('Error cambiando estado del empleado', 'error');
    }
  };

  const columns = [
    { field: 'employeeCode', headerName: t('employees.columns.code'),       width: 110 },
    { field: 'fullName',     headerName: t('employees.columns.name'),       flex: 1, minWidth: 200 },
    { field: 'department',   headerName: t('employees.columns.department'), width: 160 },
    { field: 'company',      headerName: t('employees.columns.company'),      width: 130 },
    {
      field: 'isActive', headerName: t('employees.columns.status'), width: 110,
      // ✅ StatusChip en lugar del Chip manual
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'acciones', headerName: t('common.actions'), width: 150, sortable: false,
      renderCell: ({ row }) => (
          <Button
            size="small"
            variant="outlined"
            color={row.isActive ? 'error' : 'success'}
            onClick={() => handleToggle(row.id)}
          >
            {row.isActive ? t('common.status.desactivate') : t('common.status.activate')}
          </Button>        
      ),
    },
  ];

  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2}>
          <TextField
            label={t('employees.search')} value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            size="small" sx={{ flex: 1 }}
          />
          <Button variant="contained" onClick={handleSearch}>
            {t('common.search')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => { setSearch(''); setRows(allRows); }}
          >
            {t('common.clear')}
          </Button>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={load}><Refresh /></IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Paper sx={{ height: 500 }}>
        {loading
          ? <LoadingSpinner />
          : <DataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
            />
        }
      </Paper>
    </>
  );
}