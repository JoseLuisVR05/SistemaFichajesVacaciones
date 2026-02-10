import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Grid
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useRole } from '../hooks/useRole';
import { getVacationRequests } from '../services/vacationsService';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isSameMonth, isWeekend, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * VacationCalendar - Vista de calendario mensual de ausencias del equipo
 * 
 * Muestra un calendario con las vacaciones APROBADAS de todos los
 * empleados visibles según el rol del usuario:
 * - EMPLOYEE: solo sus propias vacaciones
 * - MANAGER: las de sus subordinados + propias
 * - ADMIN/RRHH: todas
 * 
 * Cada día que tiene ausencias muestra chips con el nombre del empleado.
 * Los fines de semana se muestran en gris claro.
 */
export default function VacationCalendar() {
  const { canViewEmployees } = useRole();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [absences, setAbsences] = useState([]);  // Solicitudes aprobadas
  const [loading, setLoading] = useState(true);

  // ─── Carga de datos ───────────────────────────────────
  useEffect(() => {
    loadAbsences();
  }, [currentMonth]);

  /**
   * Carga las solicitudes APROBADAS del mes actual.
   * El backend filtra según permisos del usuario.
   */
  const loadAbsences = async () => {
    setLoading(true);
    try {
      // Rango del mes actual
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const data = await getVacationRequests({
        status: 'APPROVED',
        from: monthStart,
        to: monthEnd
      });
      setAbsences(data || []);
    } catch (err) {
      console.error('Error cargando calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Para un día dado, devuelve las solicitudes que incluyen ese día.
   * Comprueba si el día está dentro del rango [startDate, endDate].
   */
  const getAbsencesForDay = (day) => {
    return absences.filter(a => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      return day >= start && day <= end;
    });
  };

  // ─── Generar días del mes ─────────────────────────────
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular día de la semana del primer día (Lunes=0, Domingo=6)
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Ajuste para empezar en Lunes
  const emptyDays = Array(firstDayOfWeek).fill(null);

  // ─── Colores para empleados ───────────────────────────
  const employeeColors = {};
  const colorPalette = [
    '#667eea', '#f093fb', '#43e97b', '#f5576c', '#4facfe',
    '#ffa726', '#ab47bc', '#26c6da', '#ff7043', '#66bb6a'
  ];
  let colorIndex = 0;

  const getEmployeeColor = (employeeId) => {
    if (!employeeColors[employeeId]) {
      employeeColors[employeeId] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
    return employeeColors[employeeId];
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <Box sx={{ width: '75vw' }}>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Calendario de Ausencias
      </Typography>

      {/* Navegación del mes */}
      <Box display="flex" alignItems="center" justifyContent="center" mb={3} gap={2}>
        <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h5" fontWeight="600" sx={{ minWidth: 200, textAlign: 'center' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </Typography>
        <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight />
        </IconButton>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          {/* Cabecera: días de la semana */}
          <Grid container>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <Grid item key={day} xs={12/7}>
                <Box sx={{
                  textAlign: 'center', py: 1, fontWeight: 600,
                  color: (day === 'Sáb' || day === 'Dom') ? 'text.secondary' : 'text.primary'
                }}>
                  <Typography variant="subtitle2">{day}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Días del mes */}
          <Grid container>
            {/* Espacios vacíos antes del primer día */}
            {emptyDays.map((_, i) => (
              <Grid item key={`empty-${i}`} xs={12/7}>
                <Box sx={{ minHeight: 80, borderTop: '1px solid #f0f0f0' }} />
              </Grid>
            ))}

            {/* Días reales */}
            {daysInMonth.map(day => {
              const dayAbsences = getAbsencesForDay(day);
              const isWE = isWeekend(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Grid item key={day.toISOString()} xs={12/7}>
                  <Box sx={{
                    minHeight: 80,
                    borderTop: '1px solid #f0f0f0',
                    bgcolor: isWE ? '#fafafa' : isToday ? '#e3f2fd' : 'white',
                    p: 0.5
                  }}>
                    {/* Número del día */}
                    <Typography
                      variant="caption"
                      fontWeight={isToday ? 700 : 400}
                      color={isWE ? 'text.secondary' : 'text.primary'}
                      sx={{
                        display: 'inline-block',
                        ...(isToday && {
                          bgcolor: 'primary.main', color: 'white',
                          borderRadius: '50%', width: 24, height: 24,
                          lineHeight: '24px', textAlign: 'center'
                        })
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>

                    {/* Chips de ausencias */}
                    {dayAbsences.map(a => (
                      <Chip
                        key={a.requestId}
                        label={a.employeeName?.split(' ')[0]} // Solo primer nombre
                        size="small"
                        sx={{
                          mt: 0.25,
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: getEmployeeColor(a.employeeId),
                          color: 'white',
                          display: 'block',
                          mb: 0.25
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}