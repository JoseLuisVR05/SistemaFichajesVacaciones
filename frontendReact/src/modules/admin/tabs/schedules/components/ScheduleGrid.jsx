import { Box, Button, IconButton, Tooltip, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toLocalDate } from '../../../../../utils/helpers/dateUtils';
import { LoadingSpinner } from '../../../../../components/ui';

export function ScheduleGrid({
  schedules,
  loading,
  onAdd,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();

  const columns = [
    {
      field: 'validFrom',
      headerName: t('admin.schedules.columns.validFrom'),
      width: 130,
      renderCell: ({ value }) =>
        value ? format(toLocalDate(value), 'dd/MM/yyyy') : '-',
    },
    {
      field: 'validTo',
      headerName: t('admin.schedules.columns.validTo'),
      width: 130,
      renderCell: ({ value }) =>
        value ? format(toLocalDate(value), 'dd/MM/yyyy') : 'Indefinido',
    },
    {
      field: 'expectedStartTime',
      headerName: t('admin.schedules.columns.start'),
      width: 90,
    },
    {
      field: 'expectedEndTime',
      headerName: t('admin.schedules.columns.end'),
      width: 90,
    },
    {
      field: 'breakMinutes',
      headerName: t('admin.schedules.columns.break'),
      width: 100,
      renderCell: ({ value }) => `${value} min`,
    },
    {
      field: 'notes',
      headerName: t('admin.schedules.columns.notes'),
      flex: 1,
    },
    {
      field: 'acciones',
      headerName: t('common.actions'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" onClick={() => onEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          {t('admin.schedules.newSchedule')}
        </Button>
      </Box>
      <Paper sx={{ height: 380 }}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <DataGrid
            rows={schedules}
            columns={columns}
            pageSizeOptions={[10]}
            disableRowSelectionOnClick
          />
        )}
      </Paper>
    </>
  );
}
