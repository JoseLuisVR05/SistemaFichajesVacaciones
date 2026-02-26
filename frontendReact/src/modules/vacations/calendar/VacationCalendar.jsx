import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip,
  TextField, MenuItem
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useRole } from '../../../hooks/useRole';
import { getEmployees } from '../../../services/employeesService';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addYears, subYears, isWeekend, isSameDay, getYear, startOfYear, endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { getAbsenceCalendar } from '../../../services/vacationsService';

// ─── Colores fijos por tipo — no dependen del empleado ──────────────────────
const TYPE_COLOR = {
  // Claves en mayúsculas (valor canónico del backend)
  VACATION: '#667eea',
  PERSONAL: '#f5576c',
  OTHER:    '#ffa726',
  // Alias por si el backend devuelve minúsculas o valores alternativos
  vacation: '#667eea',
  personal: '#f5576c',
  other:    '#ffa726',
  Vacation: '#667eea',
  Personal: '#f5576c',
  Other:    '#ffa726',
};

/**
 * Devuelve el color correspondiente al tipo de ausencia.
 * Normaliza a mayúsculas para evitar discrepancias entre backend y frontend.
 * Si el tipo es null/undefined/desconocido, usa el color de VACATION
 * (azul-violeta) como fallback visible, en lugar de naranja.
 */
const getTypeColor = (type) => {
  if (!type) return TYPE_COLOR.VACATION;
  const normalized = String(type).toUpperCase().trim();
  return TYPE_COLOR[normalized] ?? TYPE_COLOR.VACATION;
};

// ─── Nombres de los meses ────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// ─── Mini-calendario de un mes ───────────────────────────────────────────────
function MonthGrid({ year, monthIndex, absences }) {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd   = endOfMonth(monthStart);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Lunes como primer día de la semana
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
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

      {/* Cabecera días semana */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['L','M','X','J','V','S','D'].map((d, i) => (
          <Box key={d} sx={{
            textAlign: 'center',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: i >= 5 ? 'text.disabled' : 'text.secondary',
            pb: 0.5,
            borderBottom: '1px solid #e0e0e0'
          }}>
            {d}
          </Box>
        ))}
      </Box>

      {/* Días */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {emptyDays.map((_, i) => (
          <Box key={`e-${i}`} sx={{ minHeight: 52, border: '1px solid #f5f5f5' }} />
        ))}
        {days.map(day => {
          const dayAbsences = getAbsencesForDay(day);
          const isWE  = isWeekend(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Box key={day.toISOString()} sx={{
              minHeight: 52,
              border: '1px solid #f5f5f5',
              bgcolor: isWE ? '#fafafa' : isToday ? '#e8f4fd' : 'white',
              p: 0.25,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: isToday ? 700 : 400,
                  color: isWE ? 'text.disabled' : 'text.primary',
                  lineHeight: 1,
                  mb: 0.25,
                  ...(isToday && {
                    bgcolor: 'primary.main', color: 'white',
                    borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  })
                }}
              >
                {format(day, 'd')}
              </Typography>

              {/* Ausencias del día — punto de color por tipo */}
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

// ─── Componente principal ────────────────────────────────────────────────────
export default function VacationCalendar() {
  const { canViewEmployees } = useRole();

  // Año actual como estado de navegación
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [absences, setAbsences]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [departments, setDepartments]   = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Cargar departamentos para el filtro
  useEffect(() => {
    getEmployees()
      .then(data => {
        if (data) {
          const depts = [...new Set(data.map(e => e.department).filter(Boolean))];
          setDepartments(depts);
        }
      })
      .catch(err => console.error('Error cargando filtros:', err));
  }, []);

  // Cargar todas las ausencias del año completo
  useEffect(() => {
    loadAbsences();
  }, [currentYear, departmentFilter]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const yearStart = format(new Date(currentYear, 0, 1), 'yyyy-MM-dd');
      const yearEnd   = format(new Date(currentYear, 11, 31), 'yyyy-MM-dd');

      const params = { from: yearStart, to: yearEnd };
      if (departmentFilter !== 'ALL') params.department = departmentFilter;

      const data = await getAbsenceCalendar(params);
      setAbsences(data || []);
    } catch (err) {
      console.error('Error cargando calendario anual:', err);
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar ausencias por mes para no recalcular en cada MonthGrid
  const absencesByMonth = Array.from({ length: 12 }, (_, m) =>
    absences.filter(a => {
      const d = toLocalDate(a.date);
      return d && d.getMonth() === m && d.getFullYear() === currentYear;
    })
  );

  return (
    <Box >
      <Typography variant="h4" textAlign="center" gutterBottom>
        Calendario Anual de Ausencias
      </Typography>

      {/* ── Controles ── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Navegación de año */}
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => setCurrentYear(y => y - 1)} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" fontWeight="700" sx={{ minWidth: 60, textAlign: 'center' }}>
              {currentYear}
            </Typography>
            <IconButton onClick={() => setCurrentYear(y => y + 1)} size="small">
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Filtro departamento */}
          <TextField
            select label="Departamento" value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            size="small" sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          {/* ── Leyenda — colores fijos por tipo ── */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="600">
              Leyenda:
            </Typography>
            {[
              { label: 'Vacaciones', color: TYPE_COLOR.VACATION },
              { label: 'Personal',   color: TYPE_COLOR.PERSONAL },
              { label: 'Otro',       color: TYPE_COLOR.OTHER },
            ].map(({ label, color }) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{ bgcolor: color, color: 'white', height: 22, fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ── Cuadrícula anual: 4 filas × 3 meses ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
          }}>
            {Array.from({ length: 12 }, (_, m) => (
              <Box key={m} sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 1,
                bgcolor: 'white'
              }}>
                <MonthGrid
                  year={currentYear}
                  monthIndex={m}
                  absences={absencesByMonth[m]}
                />
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}