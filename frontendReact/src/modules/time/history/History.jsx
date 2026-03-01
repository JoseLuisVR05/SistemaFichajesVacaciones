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

export default function History() {
  const navigate = useNavigate();
  const { canViewEmployees } = useRole();

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

  // ── Estado de UI — solo pertenece al componente ────────
  const [detailOpen, setDetailOpen]     = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const handleView = (entry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  // ── Columnas ───────────────────────────────────────────
  const columns = [
    { field: 'dateFormatted', headerName: 'Fecha', width: 120 },
    { field: 'timeFormatted', headerName: 'Hora',  width: 100 },
    {
      field: 'entryType', headerName: 'Tipo', width: 100,
      renderCell: ({ value }) => (
        <Chip 
          label={value === 'IN' ? 'Entrada' : 'Salida'}
          color={value === 'IN' ? 'success' : 'error'} 
          size="small" />
      ),
    },
    ...(canViewEmployees()
      ? [{ field: 'employeeName', headerName: 'Empleado', flex: 1, minWidth: 180 }]
      : []
    ),
    {
      field: 'source', headerName: 'Origen', width: 110,
      renderCell: ({ value }) => (
        <Chip 
          label={value === 'WEB' ? 'Web' : value === 'MOBILE' ? 'Móvil' : value || 'Web'}
          size="small" 
          variant="outlined" />
      ),
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <IconButton size="small" onClick={() => handleView(row)} title="Ver detalle">
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            color="primary"
            title="Solicitar corrección"
            onClick={() => navigate('/corrections', {
              state: {
                entryId: row.id,
                date: row.eventTime
                  ? format(toLocalDate(row.eventTime), 'yyyy-MM-dd')
                  : row.dateFormatted,
                openNew: true,
              },
            })}>
            <Edit fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Histórico de Fichajes
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField 
            label="Desde" 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }} 
            size="small" />
          <TextField 
            label="Hasta" 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }} 
            size="small" />
          <TextField 
            select 
            label="Tipo" 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small" 
            sx={{ minWidth: 130 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
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
                  label="Empleados" 
                  placeholder="Buscar empleados..."
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
              clearText="Limpiar"
              limitTags={2}
              isOptionEqualToValue={(option, value) => option.employeeId === value.employeeId}
            />
          )}

          <Button variant="contained" startIcon={<Search />} onClick={loadData}>
            Buscar
          </Button>
          <Button variant="outlined" onClick={exportData}>
            Exportar
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
        <DialogTitle>Detalle del fichaje</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Fecha:</strong> {selectedEntry.dateFormatted}</Typography>
              <Typography><strong>Hora:</strong> {selectedEntry.timeFormatted}</Typography>
              <Typography component="div">
                <strong>Tipo:</strong>{' '}
                <Chip 
                  label={selectedEntry.entryType === 'IN' ? 'Entrada' : 'Salida'}
                  color={selectedEntry.entryType === 'IN' ? 'success' : 'error'} 
                  size="small" />
              </Typography>
              {selectedEntry.employeeName && (
                <Typography><strong>Empleado:</strong> {selectedEntry.employeeName}</Typography>
              )}
              <Typography><strong>Origen:</strong> {selectedEntry.source || 'Web'}</Typography>
              {selectedEntry.ipAddress && (
                <Typography><strong>IP:</strong> {selectedEntry.ipAddress}</Typography>
              )}
              {selectedEntry.notes && (
                <Typography><strong>Notas:</strong> {selectedEntry.notes}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
  