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