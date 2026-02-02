import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, TextField, MenuItem, Button, IconButton, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import{Search, Visibility, Edit} from '@mui/icons-material';
import { getEntries } from '../services/timeService';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export default function History() {
  const {user, hasRole} = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  //Filtros
  const [fromDate, setFromDate] = useState(
    format(subDays(new Date(),30), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => {

    loadData();

  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const params ={ from: fromDate, to: toDate};
      const data = await getEntries(params);

      let filtered = data;
      if(typeFilter !=='ALL'){
        filtered = data.filter(e => e.entryType == typeFilter);
      }

      const formattedRows = filtered.map(entry => ({
        id: entry.timeEntryId,
        ...entry,
        fecha: format(new Date(entry.eventTime), 'dd/MM/yyyy', {locale: es}),
        hora: format(new Date(entry.eventTime), 'HH:mm:ss', {locale: es})
      }));

      setRows(formattedRows);
    } catch (err) {
      console.error('Error cargando histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () =>{
    loadData();
  };

  const canViewAllEmployees = hasRole ? hasRole(['ADMIN', 'RRHH']) : false;

  const columns = [
    { field:'fecha', headerName: 'Fecha', width: 120},
    { field:'hora', headerName: 'Hora', width: 100},
    {
      field:'entryType',
      headerName: 'Tipo',
      width: 100,
      renderCell: (params) =>(
        <Chip
          label = {params.value}
          color = {params.value === 'IN' ? 'success' : 'error'}
          size = "small"
        />
      )
    },
    {field: 'source', headerName: 'Origen', width: 100},
    {field: 'comment', headerName: 'Comentario', width: 100},
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size = "small" title = "Ver detalle">
            <Visibility fontSize = "small" />
          </IconButton>
          <IconButton size = "small" title = "Solicitar corección">
            <Edit fontSize = "small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
     <Box
      sx={{width: '75vw', height: '100vh'}}
    >
      <Typography variant="h4" gutterBottom textAlign='center'>
        Histórico de Fichajes
      </Typography>
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Desde"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Hasta"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            select
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
          </TextField>

          {canViewAllEmployees &&(
            <TextField
              label="Empleado"
              placeholder="Solo Manager/RRHH"
              size="small"
              //disabled // Implementar después
            />

          )}
          
          <Button 
            variant="contained" 
            startIcon={<Search />}
            onClick={handleSearch}
          >
            Buscar
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
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>
    </Box>
  );
}