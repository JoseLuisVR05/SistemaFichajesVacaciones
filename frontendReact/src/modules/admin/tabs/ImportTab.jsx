import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Typography, Paper,
  CircularProgress, Chip, Alert,
  IconButton, Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CloudUpload, UploadFile, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { importEmployeesCSV, getImportRuns } from '../../../services/employeesService';
import { LoadingSpinner } from '../../../components/ui';

export function ImportTab({ showSnack }) {
  const fileInputRef              = useRef(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getImportRuns();
      setHistory((data || []).map(r => ({ id: r.importRunId, ...r })));
    } catch {
      showSnack('Error cargando historial', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    setLastResult(null);
    try {
      const result = await importEmployeesCSV(file);
      setLastResult(result);
      showSnack(`Importación completada: ${result.total} filas, ${result.errors} errores`);
      loadHistory();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error en la importación', 'error');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { field: 'fileName', headerName: 'Archivo', flex: 1 },
    {
      field: 'importedAt', headerName: 'Fecha', width: 160,
      renderCell: ({ value }) =>
        value ? format(toLocalDate(value), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
    },
    { field: 'totalRows',   headerName: 'Total',  width: 80 },
    {
      field: 'successRows', headerName: 'Éxito', width: 80,
      renderCell: ({ value }) => <Chip label={value} color="success" size="small" />,
    },
    {
      field: 'errorRows', headerName: 'Errores', width: 90,
      renderCell: ({ value }) => (
        <Chip label={value} color={value > 0 ? 'error' : 'default'} size="small" />
      ),
    },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          color={
            value === 'Completed' ? 'success' :
            value === 'Failed'    ? 'error'   : 'warning'
          }
          size="small"
        />
      ),
    },
  ];

  return (
    <>
      {/* Zona de carga */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', border: '2px dashed #ccc', borderRadius: 2 }}>
        <CloudUpload sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Importar empleados desde CSV (Axapta)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Formato esperado:{' '}
          <code>
            EmployeeCode, FullName, Email, Company, BusinessUnit,
            Department, ManagerCode, IsActive, StartDate, EndDate
          </code>
          <br />
          Los empleados <strong>no presentes</strong> en el CSV serán marcados
          automáticamente como <strong>Inactivos</strong>.
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleFileSelect}
        />
        <Button
          variant="contained"
          size="large"
          startIcon={importing
            ? <CircularProgress size={20} color="inherit" />
            : <UploadFile />
          }
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importando...' : 'Seleccionar archivo CSV'}
        </Button>
      </Paper>

      {/* Resultado de la última importación */}
      {lastResult && (
        <Alert
          severity={lastResult.errors > 0 ? 'warning' : 'success'}
          sx={{ mb: 3 }}
        >
          <strong>Importación finalizada</strong> — ID: {lastResult.importRunId} |
          Total: {lastResult.total} filas | Errores: {lastResult.errors}
        </Alert>
      )}

      {/* Historial */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Historial de importaciones</Typography>
        <Tooltip title="Actualizar">
          <IconButton onClick={loadHistory}><Refresh /></IconButton>
        </Tooltip>
      </Box>
      <Paper sx={{ height: 360 }}>
        {loadingHistory
          ? <LoadingSpinner />
          : <DataGrid
              rows={history}
              columns={columns}
              pageSizeOptions={[10, 25]}
              disableRowSelectionOnClick
            />
        }
      </Paper>
    </>
  );
}