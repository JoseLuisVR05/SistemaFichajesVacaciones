// src/modules/time/history/History.jsx

// ─── Imports de React ──────────────────────────────────────────────────────
import { useState } from 'react';

// ─── Imports de MUI ───────────────────────────────────────────────────────
// ⚠️ Eliminados: todos los servicios, format, subDays, useEffect, useAuth
import {
  Box, Typography, Paper, CircularProgress,
  TextField, MenuItem, Button, IconButton,
  Chip, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Search, Visibility, Edit } from '@mui/icons-material';

// ─── Imports propios ───────────────────────────────────────────────────────
import { useHistory } from '../../../hooks/useHistory';
import { useRole } from '../../../hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';

export default function History() {
  const navigate = useNavigate();
  const { canViewEmployees } = useRole();
  const { user } = useAuth();

  // ── Hook de datos ──────────────────────────────────────
  const {
    rows, loading,
    employees, loadingEmployees,
    selectedEmployees, setSelectedEmployees,
    fromDate, setFromDate,
    toDate,   setToDate,
    typeFilter, setTypeFilter,
    loadData,
    exportData,
  } = useHistory();

  // ── Traducción ───────────────────────────────────────────
  const { t } = useTranslation();

  // ── Estado de UI — solo pertenece al componente ────────
  const [detailOpen, setDetailOpen]     = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const handleView = (entry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  // ── Columnas ───────────────────────────────────────────
  const columns = [
    { field: 'dateFormatted', headerName: t('history.columns.date'), width: 120 },
    { field: 'timeFormatted', headerName: t('history.columns.time'),  width: 100 },
    {
      field: 'entryType', headerName: t('history.columns.type'), width: 100,
      renderCell: ({ value }) => (
        <Chip 
          label={value === 'IN' ? t('history.filters.entry') : t('history.filters.exit')}
          color={value === 'IN' ? 'success' : 'error'} 
          size="small" />
      ),
    },
    ...(canViewEmployees()
      ? [{ field: 'employeeName', headerName: t('history.columns.employee'), flex: 1, minWidth: 180 }]
      : []
    ),
    {
      field: 'source', headerName: t('history.columns.source'), width: 110,
      renderCell: ({ value }) => (
        <Chip 
          label={value === 'WEB' ? 'Web' : value === 'MOBILE' ? 'Móvil' : value || 'Web'}
          size="small" 
          variant="outlined" />
      ),
    },
    {
      field: 'acciones', headerName: t('history.columns.actions'), width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <IconButton size="small" onClick={() => handleView(row)} title={t('common.view')}>
            <Visibility fontSize="small" />
          </IconButton>
          {(!canViewEmployees() || row.employeeId === user.employeeId) && (
            <IconButton 
              size="small" 
              color ="primary"
              title={t('history.actions.requestCorrection')}
              onClick={() => navigate('/corrections', {
                state: {
                  entryId: row.id,
                  date: row.eventTime
                    ? format(toLocalDate(row.eventTime), 'yyyy-MM-dd')
                    : row.dateFormatted,
                  openNew: true,             
                },
            })}
          >
            <Edit fontSize="small" />
          </IconButton>
          )}
        </Box>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        {t('history.title')}
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField 
            label={t('history.filters.from')} 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }} 
            size="small" />
          <TextField 
            label={t('history.filters.to')} 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }} 
            size="small" />
          <TextField 
            select 
            label={t('history.filters.type')} 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small" 
            sx={{ minWidth: 130 }}>
            <MenuItem value="ALL">{t('history.filters.all')}</MenuItem>
            <MenuItem value="IN">{t('history.filters.entry')}</MenuItem>
            <MenuItem value="OUT">{t('history.filters.exit')}</MenuItem>
          </TextField>

          {canViewEmployees() && (
            <Autocomplete
              multiple
              options={employees}
              getOptionLabel={(option) => `${option.fullName} (${option.employeeCode})`}
              value={selectedEmployees}
              onChange={(_, newValue) => setSelectedEmployees(newValue)}
              loading={loadingEmployees}
              size="small" 
              sx={{ minWidth: 350 }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={t('history.filters.employees')} 
                  placeholder={t('history.filters.searchEmployees')}
                  InputProps={{ 
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingEmployees ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              clearText={t('history.filters.clear')}
              limitTags={2}
              isOptionEqualToValue={(option, value) => option.employeeId === value.employeeId}
            />
          )}

          <Button variant="contained" startIcon={<Search />} onClick={loadData}>
            {t('common.search')}
          </Button>
          <Button variant="outlined" onClick={exportData}>
            {t('history.export')}
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <DataGrid 
            rows={rows} 
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            pageSizeOptions={[10, 25, 50]} 
            disableRowSelectionOnClick />
        )}
      </Paper>

      {/* Dialog de detalle */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('history.detail.title')}</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>{t('history.columns.date')}:</strong> {selectedEntry.dateFormatted}</Typography>
              <Typography><strong>{t('history.columns.time')}:</strong> {selectedEntry.timeFormatted}</Typography>
              <Typography component="div">
                <strong>{t('history.columns.type')}:</strong>{' '}
                <Chip 
                  label={selectedEntry.entryType === 'IN' ? t('history.filters.entry') : t('history.columns.exit')}
                  color={selectedEntry.entryType === 'IN' ? 'success' : 'error'} 
                  size="small" />
              </Typography>
              {selectedEntry.employeeName && (
                <Typography><strong>{t('history.columns.employee')}:</strong> {selectedEntry.employeeName}</Typography>
              )}
              <Typography><strong>{t('history.detail.origin')}:</strong> {selectedEntry.source || 'Web'}</Typography>
              {selectedEntry.ipAddress && (
                <Typography><strong>{t('history.detail.ip')}:</strong> {selectedEntry.ipAddress}</Typography>
              )}
              {selectedEntry.notes && (
                <Typography><strong>{t('history.detail.notes')}:</strong> {selectedEntry.notes}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
  