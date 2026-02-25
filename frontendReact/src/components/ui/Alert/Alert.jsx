/**
 * Alert Component
 * 
 * Uso:
 * <Alert severity="success" title="¡Exito!">
 *   Tu acción fue completada
 * </Alert>
 * 
 * Propiedades:
 * - severity: 'success' | 'error' | 'warning' | 'info' (default: 'info')
 * - title: string (opcional)
 * - onClose: function (opcional)
 * - children: ReactNode
 */

import { useState } from 'react';
import styles from './Alert.module.css';

const severityIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

export function Alert({ 
  children,
  severity = 'info',
  title,
  onClose,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className={`${styles.alert} ${styles[severity]} ${className}`}>
      <div className={styles.icon}>
        {severityIcons[severity]}
      </div>
      
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{children}</div>
      </div>

      {onClose && (
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Cerrar alerta"
        >
          ×
        </button>
      )}
    </div>
  );
}