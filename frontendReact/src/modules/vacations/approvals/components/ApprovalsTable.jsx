// src/modules/vacations/approvals/components/ApprovalsTable.jsx
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { StatusChip, LoadingSpinner } from '../../../../components/ui';
import { useTranslation } from 'react-i18next';

/**
 * ApprovalsTable
 * Tabla de solicitudes pendientes de aprobación.
 */
export function ApprovalsTable({ rows, loading, onView, onApprove, onReject }) {
  const { t } = useTranslation();

  const columns = [
    { field: 'employeeName',   headerName: t('vacations.approvals.columns.employee'), width: 180 },
    { field: 'startFormatted', headerName: t('vacations.approvals.columns.from'),    width: 110 },
    { field: 'endFormatted',   headerName: t('vacations.approvals.columns.to'),    width: 110 },
    { field: 'requestedDays',  headerName: t('vacations.approvals.columns.days'),     width: 70  },
    {
      field: 'comment', headerName: t('vacations.approvals.columns.reason'), flex: 1, minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap title={value || ''}>
          {value || '-'}
        </Typography>
      ),
    },
    {
      field: 'status', headerName: t('common.statusLabel'), width: 120,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'acciones', headerName: t('common.actions'), width: 160, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title={t('common.view')}>
            <IconButton size="small" onClick={() => onView(row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'SUBMITTED' && (
            <>
              <Tooltip title={t('vacations.approvals.approve')}>
                <IconButton size="small" color="success" onClick={() => onApprove(row.id)}>
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('vacations.approvals.reject.title')}>
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