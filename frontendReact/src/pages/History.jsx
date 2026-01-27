import { useState, useEffect } from 'react';
import { Box, Typography, Paper, AppBar, Toolbar, Button, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { getEntries } from '../services/timeService';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function History() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getEntries();
      const formattedRows = data.map(entry => ({
        id: entry.timeEntryId,
        ...entry,
        eventTime: format(new Date(entry.eventTime), 'dd/MM/yyyy HH:mm:ss', { locale: es })
      }));
      setRows(formattedRows);
    } catch (err) {
      console.error('Error cargando histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const columns = [
    { field: 'timeEntryId', headerName: 'ID', width: 70 },
    { field: 'entryType', headerName: 'Tipo', width: 100 },
    { field: 'eventTime', headerName: 'Fecha/Hora', width: 200 },
    { field: 'source', headerName: 'Origen', width: 100 },
    { field: 'comment', headerName: 'Comentario', flex: 1 },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Histórico de Fichajes
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 3 }}>
        <Paper elevation={3} sx={{ p: 2, height: 600 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
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
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
}