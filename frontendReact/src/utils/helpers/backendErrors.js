// Mapea los mensajes del backend a claves de i18n
// Así centralizas la lógica en un solo lugar
// Si el backend cambia un mensaje, solo tocas este archivo

export const mapEntryError = (message = '', t) => {

  // Error de secuencia — el más informativo para el usuario
  // "El último registro fue IN. Se esperaba OUT"
  const sequenceMatch = message.match(
    /El último registro fue (\w+)\. Se esperaba (\w+)/
  );
  if (sequenceMatch) {
    return t('timeclock.errors.wrongSequence', {
      last:     sequenceMatch[1],  // IN o OUT
      expected: sequenceMatch[2],  // OUT o IN
    });
  }

  // Errores concretos mapeados directamente
  if (message.includes('sin empleado')) return t('timeclock.errors.noEmployee');
  if (message.includes('Token inválido')) return t('timeclock.errors.invalidToken');

  // Fallback — cualquier otro error no mapeado
  return t('timeclock.errors.generic');
};

/**
 * Mapea errores específicos del módulo de correcciones
 * @param {string} message - Mensaje de error del backend
 * @param {function} t - Función de traducción i18next
 * @returns {string} - Mensaje traducido
 */
export const mapCorrectionError = (message = '', t) => {
  if (message.includes('fecha futura'))
    return t('corrections.messages.submitError');

  if (message.includes('corrección pendiente'))
    return t('corrections.messages.errorCreate');

  if (message.includes('sin empleado asignado'))
    return t('corrections.messages.errorCreate');

  if (message.includes('no encontrada'))
    return t('corrections.messages.errorUpdate');

  if (message.includes('ya fue procesada'))
    return t('corrections.messages.errorUpdate');

  return t('corrections.messages.errorCreate');
};