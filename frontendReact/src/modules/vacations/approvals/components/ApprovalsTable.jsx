// src/modules/vacations/approvals/components/ApprovalsTable.jsx
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { StatusChip, LoadingSpinner } from '../../../../components/ui';

/**
 * ApprovalsTable
 * Tabla de solicitudes pendientes de aprobación.
 */
export function ApprovalsTable({ rows, loading, onView, onApprove, onReject }) {
  const columns = [
    { field: 'employeeName',   headerName: 'Empleado', width: 180 },
    { field: 'startFormatted', headerName: 'Desde',    width: 110 },
    { field: 'endFormatted',   headerName: 'Hasta',    width: 110 },
    { field: 'requestedDays',  headerName: 'Días',     width: 70  },
    {
      field: 'comment', headerName: 'Motivo', flex: 1, minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap title={value || ''}>
          {value || '-'}
        </Typography>
      ),
    },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => onView(row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'SUBMITTED' && (
            <>
              <Tooltip title="Aprobar">
                <IconButton size="small" color="success" onClick={() => onApprove(row.id)}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rechazar">
                <IconButton size="small" color="error" onClick={() => onReject(row)}>
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
      pageSizeOptions={[10, 25]}
      disableRowSelectionOnClick
    />
  );
}