// src/modules/vacations/requests/components/RequestsTable.jsx
import {
  Box, Paper, TextField, MenuItem,
  Button, IconButton, Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Send, Cancel, Visibility } from '@mui/icons-material';
import { StatusChip, LoadingSpinner } from '../../../../components/ui';
import { t } from 'i18next';

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
    { field: 'startFormatted', headerName: t('vacations.table.from'), width: 110 },
    { field: 'endFormatted',   headerName: t('vacations.table.to'), width: 110 },
    { field: 'requestedDays',  headerName: t('vacations.table.days'),  width: 70, type: 'number' },
    {
      field: 'type',
      headerName: t('vacations.table.type'),
      width: 130,
      renderCell: ({ value }) => (
        <span>
          {value === 'VACATION' ? t('vacations.table.columns.vacation')
            : value === 'PERSONAL' ? t('vacations.table.columns.personal')
            : value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: t('common.statusLabel'),
      width: 120,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title={t('common.view')}>
            <IconButton size="small" onClick={() => onView(row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'DRAFT' && (
            <Tooltip title={t('vacations.table.submittedForApproval')}>
              <IconButton size="small" color="primary" onClick={() => onSubmit(row.id)}>
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(row.status === 'DRAFT' || row.status === 'SUBMITTED') && (
            <Tooltip title={t('common.cancel')}>
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
            label={t('common.statusLabel')}
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">{t('common.status.all')}</MenuItem>
            <MenuItem value="DRAFT">{t('common.status.draft')}</MenuItem>
            <MenuItem value="SUBMITTED">{t('common.status.submitted')}</MenuItem>
            <MenuItem value="APPROVED">{t('common.status.approved')}</MenuItem>
            <MenuItem value="REJECTED">{t('common.status.rejected')}</MenuItem>
            <MenuItem value="CANCELLED">{t('common.status.cancelled')}</MenuItem>
          </TextField>
          <Button variant="contained" onClick={onSearch} size="small">
            {t('common.filter')}
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