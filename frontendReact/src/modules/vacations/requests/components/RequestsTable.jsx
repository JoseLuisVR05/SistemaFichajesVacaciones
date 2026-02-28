// src/modules/vacations/requests/components/RequestsTable.jsx
import {
  Box, Paper, TextField, MenuItem,
  Button, IconButton, Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Send, Cancel, Visibility } from '@mui/icons-material';
import { StatusChip, LoadingSpinner } from '../../../../components/ui';

/**
 * RequestsTable
 * Filtro de estado + tabla de historial de solicitudes propias.
 *
 * @param {Array}    rows          - Solicitudes ya formateadas
 * @param {boolean}  loading       - Si está cargando
 * @param {string}   statusFilter  - Filtro de estado activo
 * @param {function} onStatusFilterChange
 * @param {function} onSearch      - Callback al pulsar "Filtrar"
 * @param {function} onView        - Callback al pulsar Ver (recibe la fila)
 * @param {function} onSubmit      - Callback al pulsar Enviar (recibe requestId)
 * @param {function} onCancel      - Callback al pulsar Cancelar (recibe requestId)
 */
export function RequestsTable({
  rows,
  loading,
  statusFilter,
  onStatusFilterChange,
  onSearch,
  onView,
  onSubmit,
  onCancel,
}) {
  const columns = [
    { field: 'startFormatted', headerName: 'Desde', width: 110 },
    { field: 'endFormatted',   headerName: 'Hasta', width: 110 },
    { field: 'requestedDays',  headerName: 'Días',  width: 70, type: 'number' },
    {
      field: 'type',
      headerName: 'Tipo',
      width: 130,
      renderCell: ({ value }) => (
        <span>
          {value === 'VACATION' ? 'Vacaciones'
            : value === 'PERSONAL' ? 'Personal'
            : value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => onView(row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'DRAFT' && (
            <Tooltip title="Enviar para aprobación">
              <IconButton size="small" color="primary" onClick={() => onSubmit(row.id)}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(row.status === 'DRAFT' || row.status === 'SUBMITTED') && (
            <Tooltip title="Cancelar">
              <IconButton size="small" color="error" onClick={() => onCancel(row.id)}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <>
      {/* Filtro de estado */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            label="Estado"
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="DRAFT">Borrador</MenuItem>
            <MenuItem value="SUBMITTED">Enviada</MenuItem>
            <MenuItem value="APPROVED">Aprobada</MenuItem>
            <MenuItem value="REJECTED">Rechazada</MenuItem>
            <MenuItem value="CANCELLED">Cancelada</MenuItem>
          </TextField>
          <Button variant="contained" onClick={onSearch} size="small">
            Filtrar
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ height: 500 }}>
        {loading
          ? <LoadingSpinner />
          : <DataGrid
              rows={rows}
              columns={columns}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              pageSizeOptions={[10, 25]}
              disableRowSelectionOnClick
            />
        }
      </Paper>
    </>
  );
}