import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, TextField, MenuItem, Button, IconButton, Chip, Autocomplete } from '@mui/material';
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
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  

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
    if (canViewEmployees){
      loadEmployees();
    }
  }, []);

  useEffect(() => {

    loadData();

  }, [selectedEmployee]);

   const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
      console.log('Empleados cargados:', data)
    }catch(err){
      console.error('Error cargando empleados:', err);
    }finally{
      setLoadingEmployees(false);
    }
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const params ={ from: fromDate, to: toDate};

      if(selectedEmployee){
        params.employeeId = selectedEmployee.employeeId;
        console.log('Buscando fichajes de:', selectedEmployee.fullName);
      }else{
        console.log('Buscandos mis propios fichajes');
      }

      const data = await getEntries(params);
      console.log('Fichajes recibidos:', data.length);

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
          <IconButton 
          size = "small" 
          title = "Solicitar corección"
          onClick = { () => navigate('/corrections',{
            state: {
              fromEntry: {
                date: params.row.eventTime?.split('T')[0],
                entryType: params.row.entryType,
                source: params.row.source,
                timeEntryId: params.row.id
              }
            }
          })}>
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

          {canViewEmployees() &&(
           <Autocomplete
              options={employees}
              getOptionLabel={(option) =>
                `${option.fullName} (${option.employeeCode})`
              }
              value={selectedEmployee}
              onChange={(_, newValue) => setSelectedEmployee(newValue)}
              loading={loadingEmployees}
              size="small"
              sx={{ minWidth: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isManager() ? "Buscar Subordinado":"Buscar empleado"}
                  placeholder="Nombre, código, email..."
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
              renderOption={(props, option) => (
                <li {...props} key={option.employeeId}>
                  <Box>
                    <Typography variant="body2">
                      <strong>{option.fullName}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employeeCode} • {option.email} • {option.department || 'Sin departamento'}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText={isManager() ? "NO tienes subordinados o no se encontraron": "No se encontraron empleados"}
              clearText="Limpiar"
              isOptionEqualToValue={(option, value) =>
                option.employeeId === value.employeeId
              }
            />
          )}
          
          <Button 
            variant="contained" 
            startIcon={<Search />}
            onClick={handleSearch}
          >
            Buscar
          </Button>
          <Button
            variant='outlined'
            onClick={async () =>{
              try {
                await exportEntries({ from: fromDate, to: toDate});
              } catch (err){
                console.error('Error exportando', err);
              }
            }}
          >
            Exportar CSV
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
            pageSizeOptions ={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>
    </Box>
  );
}