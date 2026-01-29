import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, TextField, MenuItem, Button, IconButton, Chip } from '@mui/material';
import { DataGrid, esES } from '@mui/x-data-grid';
import { Visibility } from '@mui/icons-material';
import { getEntries } from '../services/timeService';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: format(startOfMonth(new Date()),'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    type:'',
    employedId:''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const params={
        from: filters.dateFrom,
        to: filters.dateTo
      };

      const data = await getEntries(params);

      const formattedRows = data.map(entry => ({
        id: entry.timeEntryId,
        fecha: format(new Date(entry.eventTime), 'dd/MM/yyyy', { locale: es }),
        hora: format(new Date(entry.eventTime), 'HH:mm:ss', { locale: es }),
        tipo: entry.entryType,
        origen: entry.source,
        comentario: entry.comment || '-',
        actions:'' //Campo dummy para la columna de acciones
      }));

      setRows(formattedRows);
    } catch (err) {
      console.error('Error cargando histórico:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch=() =>{
    loadData();
  }

  const columns = [
    { 
      field: 'fecha', 
      headerName: 'Fecha', 
      width: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'hora', 
      headerName: 'Hora', 
      width: 110,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'tipo', 
      headerName: 'Tipo', 
      width: 100,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'IN' ? 'success' : 'error'}
          size="small"
          sx={{ 
            minWidth: 50, 
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        />
      )
    },
    { 
      field: 'origen', 
      headerName: 'Origen', 
      width: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'comentario', 
      headerName: 'Comentario', 
      flex: 1,
      minWidth: 200,
      headerAlign: 'left',
      align: 'left'
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      headerAlign: 'center',
      align: 'center',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const handleView = (e) => {
          e.stopPropagation();
          console.log('Ver fichaje:', params.row);
          // Aquí puedes agregar tu lógica para ver detalles
        };

        const handleEdit = (e) => {
          e.stopPropagation();
          console.log('Corregir fichaje:', params.row);
          // Aquí puedes agregar tu lógica para editar
        };

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              color="primary" 
              onClick={handleView}
              aria-label="Ver"
            >
              <Visibility fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              color="secondary" 
              onClick={handleEdit}
              aria-label="Corregir"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Histórico de fichajes
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          Filtros
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap', 
          alignItems: 'center',
          mt: 2 
        }}>
          <TextField
            label="Desde"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 160 }}
          />
          
          <TextField
            label="Hasta"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 160 }}
          />
          
          <TextField
            label="Tipo"
            select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            size="small"
            sx={{ width: 140 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
          </TextField>
          
          <TextField
            label="Empleado*"
            placeholder="solo Manager/RRHH"
            size="small"
            disabled
            sx={{ width: 200 }}
            helperText="Función disponible para managers"
          />
          
          <Button 
            variant="contained" 
            onClick={handleSearch}
            sx={{ 
              height: 40,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Buscar
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <Typography 
          variant="subtitle1" 
          fontWeight="600" 
          sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          Tabla
        </Typography>
        
        {loading ? (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height="calc(100% - 60px)"
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 'calc(100% - 60px)' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              initialState={{
                pagination: { 
                  paginationModel: { pageSize: 10 } 
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              localeText={esES.components.MuiDataGrid.defaultProps.localeText}
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'grey.100',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.875rem'
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'grey.50'
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '2px solid',
                  borderColor: 'divider'
                }
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
} 