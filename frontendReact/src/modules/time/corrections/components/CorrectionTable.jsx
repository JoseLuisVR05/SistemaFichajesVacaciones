// CorrectionTable.jsx — solo renderiza la tabla, no sabe nada de la API
import { Box, IconButton, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Visibility, CheckCircle, Cancel,
  Edit, DeleteForever
} from '@mui/icons-material';
import { StatusChip, LoadingSpinner } from '../../../../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../../utils/helpers/dateUtils';
import { useTranslation } from 'react-i18next';
import { t } from 'i18next';

const formatMinutes = (mins) => {
  if (mins == null) return '-';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${mins < 0 ? '-' : ''}${h}h ${String(m).padStart(2, '0')}m`;
};

// Columnas base compartidas entre los dos modos
const baseColumns = [
  {
    field: 'date', headerName: t('corrections.columns.date'), width: 110,
    renderCell: ({ value }) =>
      value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : '-',
  },
  {
    field: 'originalMinutes', headerName: t('corrections.columns.originalMinutes'), width: 130,
    renderCell: ({ value }) => formatMinutes(value),
  },
  {
    field: 'correctedMinutes', headerName: t('corrections.columns.correctedMinutes'), width: 130,
    renderCell: ({ value }) => formatMinutes(value),
  },
  {
    field: 'reason', headerName: t('corrections.columns.reason'), flex: 1, minWidth: 200,
  },
  {
    field: 'status', headerName: t('common.statusLabel'), width: 120,
    renderCell: ({ value }) => <StatusChip status={value} />,
  },
  {
    field: 'createdAt', headerName: t('corrections.columns.created'), width: 140,
    renderCell: ({ value }) =>
      value ? format(toLocalDate(value), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
  },
];

/**
 * CorrectionTable
 *
 * @param {'own'|'management'} mode
 *   - 'own': muestra las correcciones propias con editar/cancelar
 *   - 'management': muestra correcciones del equipo con aprobar/rechazar
 */
export function CorrectionTable({
  rows,
  loading,
  mode = 'own',
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) {

  const { t } = useTranslation();
  const actionsColumn = {
    field: 'acciones',
    headerName: t('common.actions'),
    width: mode === 'management' ? 160 : 160,
    sortable: false,
    renderCell: ({ row }) => (
      <Box>
        <Tooltip title={t('common.view')}>
          <IconButton size="small" onClick={() => onView(row)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Modo propio: editar y cancelar si está pendiente */}
        {mode === 'own' && row.status === 'PENDING' && (
          <>
            <Tooltip title={t('common.edit')}>
              <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('corrections.delete.confirm')}>

              <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                <DeleteForever fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}

        {/* Modo gestión: aprobar y rechazar si está pendiente */}
        {mode === 'management' && row.status === 'PENDING' && (
          <>
            <Tooltip title={t('common.status.approved')}>
              <IconButton size="small" color="success" onClick={() => onApprove(row.id)}>
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.status.rejected')}>

              <IconButton size="small" color="error" onClick={() => onReject(row)}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    ),
  };

  const columns = [
    ...(mode === 'management'
      ? [{ field: 'employeeName', headerName: t('corrections.columns.employee'), width: 180 }]
      : []
    ),
    ...baseColumns,
    actionsColumn,
  ];

  const formattedRows = rows.map(c => ({
    ...c,
    id: c.correctionId ?? c.id,
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <DataGrid
      rows={formattedRows}
      columns={columns}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
      pageSizeOptions={[10, 25, 50]}
      disableRowSelectionOnClick
    />
  );
}