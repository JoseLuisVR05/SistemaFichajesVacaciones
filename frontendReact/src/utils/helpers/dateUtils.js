/**
 * Convierte una fecha UTC del backend a objeto Date local.
 * .NET envía "2025-01-15T14:30:00" SIN 'Z', y JS lo interpreta como local.
 * Añadimos 'Z' para que JS lo trate como UTC y lo convierta a hora local.
 */
export const toLocalDate = (utcDateString) => {
  if (!utcDateString) return null;
  const str = String(utcDateString);
  const utcString = str.endsWith('Z') ? str : str + 'Z';
  return new Date(utcString);
};

export const formatDateTime = (utcDateString) => {
  const date = toLocalDate(utcDateString);
  if (!date || isNaN(date)) return '-';
  return date.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const formatDate = (utcDateString) => {
  const date = toLocalDate(utcDateString);
  if (!date || isNaN(date)) return '-';
  return date.toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

export const formatTime = (utcDateString) => {
  const date = toLocalDate(utcDateString);
  if (!date || isNaN(date)) return '-';
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  });
};

export const formatTimeWithSeconds = (utcDateString) => {
  const date = toLocalDate(utcDateString);
  if (!date || isNaN(date)) return '-';
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

/**
 * Para usar con date-fns: convierte UTC string a Date local.
 * Úsalo donde antes hacías new Date(backendDate).
 */
export const parseUTC = (utcDateString) => toLocalDate(utcDateString);