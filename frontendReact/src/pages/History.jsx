import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, TextField, MenuItem, Button, IconButton, Chip, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Search, Visibility, Edit } from '@mui/icons-material';
import { getEmployees } from '../services/employeesService';
import { getEntries, exportEntries } from '../services/timeService';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';

export default function History() {
  const { user } = useAuth();
  const { canViewEmployees, isManager } = useRole();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  

  //Filtros
  const [fromDate, setFromDate] = useState(
    format(subDays(new Date(),30), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Cargar empleados si es MANAGER/RRHH/ADMIN
  useEffect(() =>{
    if (canViewEmployees()){
      setLoadingEmployees(true);
      getEmployees()
        .then(data => setEmployees(data || []))
        .catch(err => console.error('Erros cargando empleados:', err))
        .finally(() => setLoadingEmployees(false));
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const baseParams = { from: fromDate, to: toDate };

      let allData = [];

      if (selectedEmployees.length > 0) {
        // Pedir fichajes de cada empleado seleccionado
        const promises = selectedEmployees.map(emp =>
          getEntries({ ...baseParams, employeeId: emp.employeeId })
        );
        const results = await Promise.all(promises);
        allData = results.flat();
      } else {
        allData = await getEntries(baseParams);
      }

      // Filtro local por tipo
      if (typeFilter !== 'ALL') {
        allData = (allData || []).filter(entry => entry.entryType === typeFilter);
      }

      const formatted = (allData || []).map((entry, idx) => ({
        id: entry.timeEntryId || idx,
        ...entry,
        dateFormatted: entry.eventTime
          ? format(new Date(entry.eventTime), 'dd/MM/yyyy', { locale: es })
          : '-',
        timeFormatted: entry.eventTime
          ? format(new Date(entry.eventTime), 'HH:mm:ss', { locale: es })
          : '-',
      }));
      setRows(formatted);
    } catch (err) {
      console.error('Error cargando histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
    loadData();
  };

  const handleExport = async () => {
    try{
      const params = { from: fromDate, to: toDate};
      if (typeFilter !== 'ALL') params.entryType =typeFilter;
      if (selectedEmployees.length ===1) params.employeeId =selectedEmployees[0].employeeId;
      await exportEntries(params);
    } catch (err) {
      console.error('Error exportando:', err);
    }
  };

  const handleView = (entry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  // Columnas — Mockup: Fecha | Hora | Tipo | Empleado(Manager) | Acciones [Ver][Editar/Corregir]
  const columns = [
    { field: 'dateFormatted', headerName: 'Fecha', width: 120 },
    { field: 'timeFormatted', headerName: 'Hora', width: 100 },
    {
      field: 'entryType', headerName: 'Tipo', width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'IN' ? 'Entrada' : 'Salida'}
          color={value === 'IN' ? 'success' : 'error'}
          size="small"
        />
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
          size="small" variant="outlined"
        />
      ),
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          {/* ✅ NUEVO: Botón "Ver" (Visibility icon) — Mockup lo pide */}
          <IconButton size="small" onClick={() => handleView(row)} title="Ver detalle">
            <Visibility fontSize="small" />
          </IconButton>
          {/* Botón Editar / Solicitar corrección */}
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate('/corrections', { state: { 
              entryId: row.id, 
              date: row.eventTime ? format(new Date(row.eventTime), 'yyyy-MM-dd') : row.dateFormatted,
              openNew: true } })}
            title="Solicitar corrección"
          >
            <Edit fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '75vw' }}>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Histórico de Fichajes
      </Typography>

      {/* Filtros — Mockup: [Desde] [Hasta] [Tipo] [Empleado (Manager/RRHH)] [Buscar] */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Desde" type="date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small"
          />
          <TextField
            label="Hasta" type="date" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }} size="small"
          />
          <TextField
            select label="Tipo" value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small" sx={{ minWidth: 130 }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
          </TextField>

          {/* Selector de empleado para Manager/RRHH */}
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
                  {...params} label="Empleados" placeholder="Buscar empleados..."
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

          <Button variant="contained" startIcon={<Search />} onClick={handleSearch}>
            Buscar
          </Button>
          <Button variant="outlined" onClick={handleExport}>
            Exportar
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows} 
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>

      {/* ✅ NUEVO: Dialog de detalle ("Ver") */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle del fichaje</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography><strong>Fecha:</strong> {selectedEntry.dateFormatted}</Typography>
              <Typography><strong>Hora:</strong> {selectedEntry.timeFormatted}</Typography>
              <Typography>
                <strong>Tipo:</strong>{' '}
                <Chip
                  label={selectedEntry.entryType === 'IN' ? 'Entrada' : 'Salida'}
                  color={selectedEntry.entryType === 'IN' ? 'success' : 'error'}
                  size="small"
                />
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

  