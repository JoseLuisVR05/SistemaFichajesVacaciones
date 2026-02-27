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

const formatMinutes = (mins) => {
  if (mins == null) return '-';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${mins < 0 ? '-' : ''}${h}h ${String(m).padStart(2, '0')}m`;
};

// Columnas base compartidas entre los dos modos
const baseColumns = [
  {
    field: 'date', headerName: 'Fecha', width: 110,
    renderCell: ({ value }) =>
      value ? format(toLocalDate(value), 'dd/MM/yyyy', { locale: es }) : '-',
  },
  {
    field: 'originalMinutes', headerName: 'Min. originales', width: 130,
    renderCell: ({ value }) => formatMinutes(value),
  },
  {
    field: 'correctedMinutes', headerName: 'Min. corregidos', width: 130,
    renderCell: ({ value }) => formatMinutes(value),
  },
  {
    field: 'reason', headerName: 'Motivo', flex: 1, minWidth: 200,
  },
  {
    field: 'status', headerName: 'Estado', width: 120,
    renderCell: ({ value }) => <StatusChip status={value} />,
  },
  {
    field: 'createdAt', headerName: 'Creado', width: 140,
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
  const actionsColumn = {
    field: 'acciones',
    headerName: 'Acciones',
    width: mode === 'management' ? 160 : 160,
    sortable: false,
    renderCell: ({ row }) => (
      <Box>
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => onView(row)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Modo propio: editar y cancelar si está pendiente */}
        {mode === 'own' && row.status === 'PENDING' && (
          <>
            <Tooltip title="Editar solicitud">
              <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancelar solicitud">
              <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                <DeleteForever fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}

        {/* Modo gestión: aprobar y rechazar si está pendiente */}
        {mode === 'management' && row.status === 'PENDING' && (
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
  };

  const columns = [
    ...(mode === 'management'
      ? [{ field: 'employeeName', headerName: 'Empleado', width: 180 }]
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