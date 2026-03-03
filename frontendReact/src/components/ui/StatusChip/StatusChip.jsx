// src/components/ui/StatusChip/StatusChip.jsx
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';



/**
 * StatusChip
 *
 * Muestra un Chip de MUI con el color y texto correcto según el estado.
 *
 * @param {string|boolean} status - El valor del estado (ej: 'PENDING', true, 'IN')
 * @param {'small'|'medium'} size - Tamaño del chip (default: 'small')
 *
 * @example
 * <StatusChip status="PENDING" />
 * <StatusChip status={employee.isActive} />
 * <StatusChip status="IN" />
 */
export function StatusChip({ status, size = 'small' }) {

const { t } = useTranslation();

  // ─── Mapa central de todos los estados de la aplicación ──────────────────────
// Si el backend cambia un valor, se cambia aquí y se propaga a toda la app.
const STATUS_CONFIG = {
  // Estados de corrección
  PENDING:   { label: t('common.status.pending'),  color: 'warning' },
  APPROVED:  { label: t('common.status.approved'),   color: 'success' },
  REJECTED:  { label: t('common.status.rejected'),  color: 'error'   },

  // Estados de vacaciones
  DRAFT:     { label: t('common.status.draft'),   color: 'default' },
  SUBMITTED: { label: t('common.status.submitted'),    color: 'info'    },
  CANCELLED: { label: t('common.status.cancelled'),  color: 'default' },

  // Estados de empleado
  true:      { label: t('common.status.active'),     color: 'success' },
  false:     { label: t('common.status.inactive'),   color: 'default' },

  // Tipos de fichaje
  IN:        { label: t('common.status.in'),    color: 'success' },
  OUT:       { label: t('common.status.out'),     color: 'error'   },

  // Origen de fichaje
  WEB:       { label: t('common.status.web'),        color: 'default' },
  MOBILE:    { label: t('common.status.mobile'),      color: 'default' },
};
  const key = String(status);
  const config = STATUS_CONFIG[key] ?? { label: key, color: 'default' };
  

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
    />
  );
}