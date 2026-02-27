// src/components/ui/StatusChip/StatusChip.jsx
import { Chip } from '@mui/material';

// ─── Mapa central de todos los estados de la aplicación ──────────────────────
// Si el backend cambia un valor, se cambia aquí y se propaga a toda la app.
const STATUS_CONFIG = {
  // Estados de corrección
  PENDING:   { label: 'Pendiente',  color: 'warning' },
  APPROVED:  { label: 'Aprobado',   color: 'success' },
  REJECTED:  { label: 'Rechazado',  color: 'error'   },

  // Estados de vacaciones
  DRAFT:     { label: 'Borrador',   color: 'default' },
  SUBMITTED: { label: 'Enviada',    color: 'info'    },
  CANCELLED: { label: 'Cancelada',  color: 'default' },

  // Estados de empleado
  true:      { label: 'Activo',     color: 'success' },
  false:     { label: 'Inactivo',   color: 'default' },

  // Tipos de fichaje
  IN:        { label: 'Entrada',    color: 'success' },
  OUT:       { label: 'Salida',     color: 'error'   },

  // Origen de fichaje
  WEB:       { label: 'Web',        color: 'default' },
  MOBILE:    { label: 'Móvil',      color: 'default' },
};

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