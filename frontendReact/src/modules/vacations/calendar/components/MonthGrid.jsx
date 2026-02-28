// src/modules/vacations/calendar/components/MonthGrid.jsx
//
// FASE 1.3: Extraído de VacationCalendar.jsx donde vivía definido
// dentro del mismo archivo.
//
// ¿Por qué extraerlo?
//
// 1. RENDIMIENTO: Cuando un componente está definido DENTRO de otro,
//    React lo trata como una función nueva en cada render del padre.
//    Esto impide optimizaciones como React.memo.
//
// 2. RESPONSABILIDAD ÚNICA: MonthGrid sabe pintar un mes.
//    VacationCalendar sabe cargar y orquestar los 12 meses.
//    Son dos responsabilidades distintas → dos archivos distintos.
//
// 3. TESTEABILIDAD: Ahora podemos testear MonthGrid de forma aislada
//    sin necesitar montar el calendario completo.
//
// Props:
//   year       {number}  - Año a mostrar
//   monthIndex {number}  - Índice del mes (0 = enero, 11 = diciembre)
//   absences   {Array}   - Ausencias filtradas para este mes

import { Box, Typography } from '@mui/material';
import { endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay } from 'date-fns';
import { toLocalDate } from '../../../../utils/helpers/dateUtils';

// Mapa de colores por tipo de ausencia.
// Vive aquí y se exporta para que VacationCalendar pueda usarlo
// en la leyenda sin duplicar la definición.
export const TYPE_COLOR = {
  VACATION: '#667eea',
  PERSONAL: '#f5576c',
  OTHER:    '#ffa726',
};

/**
 * Devuelve el color del tipo de ausencia normalizando a mayúsculas.
 * Si el tipo es desconocido, usa VACATION como fallback visible.
 */
export const getTypeColor = (type) => {
  if (!type) return TYPE_COLOR.VACATION;
  const normalized = String(type).toUpperCase().trim();
  return TYPE_COLOR[normalized] ?? TYPE_COLOR.VACATION;
};

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export function MonthGrid({ year, monthIndex, absences }) {
  const monthStart     = new Date(year, monthIndex, 1);
  const monthEnd       = endOfMonth(monthStart);
  const days           = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Lunes = 0
  const emptyDays      = Array(firstDayOfWeek).fill(null);

  const getAbsencesForDay = (day) =>
    absences.filter(a => isSameDay(toLocalDate(a.date), day));

  return (
    <Box sx={{ minWidth: 220 }}>
      <Typography
        variant="subtitle2"
        fontWeight="700"
        textAlign="center"
        sx={{ mb: 0.5, color: 'text.primary' }}
      >
        {MONTH_NAMES[monthIndex]}
      </Typography>

      {/* Cabecera días de la semana */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <Box
            key={d}
            sx={{
              textAlign: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: i >= 5 ? 'text.disabled' : 'text.secondary',
              pb: 0.5,
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            {d}
          </Box>
        ))}
      </Box>

      {/* Días del mes */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {/* Celdas vacías para alinear el primer día */}
        {emptyDays.map((_, i) => (
          <Box key={`empty-${i}`} sx={{ minHeight: 52, border: '1px solid #f5f5f5' }} />
        ))}

        {days.map(day => {
          const dayAbsences = getAbsencesForDay(day);
          const isWE        = isWeekend(day);
          const isToday     = isSameDay(day, new Date());

          return (
            <Box
              key={day.toISOString()}
              sx={{
                minHeight: 52,
                border: '1px solid #f5f5f5',
                bgcolor: isWE ? '#fafafa' : isToday ? '#e8f4fd' : 'white',
                p: 0.25,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: isToday ? 700 : 400,
                  color: isWE ? 'text.disabled' : 'text.primary',
                  lineHeight: 1,
                  mb: 0.25,
                  ...(isToday && {
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }),
                }}
              >
                {format(day, 'd')}
              </Typography>

              {/* Ausencias del día */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
                {dayAbsences.slice(0, 3).map(a => (
                  <Box
                    key={a.requestId ?? `${a.employeeId}-${a.date}`}
                    title={`${a.employeeName} (${a.absenceType})`}
                    sx={{
                      bgcolor: getTypeColor(a.absenceType),
                      borderRadius: 0.5,
                      px: 0.3,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      fontSize: '0.58rem',
                      color: 'white',
                      lineHeight: '13px',
                    }}
                  >
                    {a.employeeName?.split(' ')[0]}
                  </Box>
                ))}
                {dayAbsences.length > 3 && (
                  <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', lineHeight: 1 }}>
                    +{dayAbsences.length - 3} más
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}