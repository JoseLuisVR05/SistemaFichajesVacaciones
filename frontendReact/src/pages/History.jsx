import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { getEntries } from '../services/timeService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function History() {
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

  const columns = [
    { field: 'timeEntryId', headerName: 'ID', width: 70 },
    { field: 'entryType', headerName: 'Tipo', width: 100 },
    { field: 'eventTime', headerName: 'Fecha/Hora', width: 200 },
    { field: 'source', headerName: 'Origen', width: 100 },
    { field: 'comment', headerName: 'Comentario', flex: 1 },
  ];

  return (
    <Box>
          <Typography variant="h4" gutterBottom>
            Histórico de Fichajes
          </Typography>
          <Paper elevation={3} sx={{ p: 2, height: 600, mt:3 }}>
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
              />
            )}
          </Paper>
    </Box>
  );
}
          