import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Grid,
  TextField, MenuItem
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useRole } from '../../../hooks/useRole';
import { getVacationRequests } from '../../../services/vacationsService';
import { getEmployees } from '../../../services/employeesService';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isWeekend, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { getAbsenceCalendar } from '../../../services/vacationsService';


export default function VacationCalendar() {
  const { canViewEmployees } = useRole();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);


  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [teams, setTeams] = useState([]);  // Lista de managers/equipos

  //  Cargar empleados para filtros 
  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const data = await getEmployees();
      if (data) {
        const depts = [...new Set(data.map(e => e.department).filter(Boolean))];
        setDepartments(depts);
        // Equipos = managers únicos (si el backend tiene managerId o similar)
        const mgrs = [...new Set(data.map(e => e.managerId).filter(Boolean))];
        // Simplificamos: usamos departamentos como "equipos" si no hay managerId explícito
        setTeams(depts);
      }
    } catch (err) {
      console.error('Error cargando filtros:', err);
    }
  };

  // Carga de ausencias 
  useEffect(() => {
    loadAbsences();
  }, [currentMonth, departmentFilter, teamFilter]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const data = await getAbsenceCalendar({
        from: monthStart,
        to: monthEnd,
        department: departmentFilter
      });

      setAbsences(data || []);      
    } catch (err) {
      console.error('Error cargando calendario de ausencias', err);
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  };

  const getAbsencesForDay = (day) => {
    return absences.filter(a => {
      return isSameDay(toLocalDate(a.date), day);
    });
  };

  // Generar días del mes
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  const emptyDays = Array(firstDayOfWeek).fill(null);

  // Colores por empleado
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

  // Determinar tipos únicos para la leyenda
  const absenceTypes = [...new Set(absences.map(a => a.type || 'VACATION'))];

  return (
    <Box sx={{ width: '75vw' }}>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Calendario de Ausencias
      </Typography>

      {/* Controles: [Mes] [Departamento] [Equipo] Leyenda */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Navegación del mes */}
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="600" sx={{ minWidth: 160, textAlign: 'center' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </Typography>
            <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} size="small">
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Filtro Departamento */}
          <TextField select label="Departamento" value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>

          {/* Filtro Equipo */}
          <TextField select label="Equipo" value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="ALL">Todos</MenuItem>
            {teams.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          {/* ✅ NUEVO: Leyenda (mockup la pide) */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="600">Leyenda:</Typography>
            <Chip label="Vacaciones" size="small" sx={{ bgcolor: '#667eea', color: 'white', height: 22, fontSize: '0.7rem' }} />
            <Chip label="Personal" size="small" sx={{ bgcolor: '#f5576c', color: 'white', height: 22, fontSize: '0.7rem' }} />
            <Chip label="Otro" size="small" sx={{ bgcolor: '#ffa726', color: 'white', height: 22, fontSize: '0.7rem' }} />
          </Box>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          {/* Cabecera: días de la semana */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <Box key={day} sx={{
                textAlign: 'center', py: 1.5, fontWeight: 700, fontSize: '0.85rem',
                color: (day === 'Sáb' || day === 'Dom') ? 'text.disabled' : 'text.primary',
                borderBottom: '2px solid #e0e0e0'
            }}>
            {day}
          </Box>
          ))}
        </Box>

          {/* Días del mes */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {emptyDays.map((_, i) => (
              <Box key={`empty-${i}`} sx={{ minHeight: 110, border: '1px solid #f0f0f0' }} />
            ))}

            {daysInMonth.map(day => {
              const dayAbsences = getAbsencesForDay(day);
              const isWE = isWeekend(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Box key={day.toISOString()} sx={{
                  minHeight: 110, border: '1px solid #f0f0f0',
                  bgcolor: isWE ? '#fafafa' : isToday ? '#e8f4fd' : 'white',
                  p: 1, display: 'flex', flexDirection: 'column'
                }}>
                  <Typography variant="body2" fontWeight={isToday ? 700 : 400}
                    color={isWE ? 'text.disabled' : 'text.primary'}
                    sx={{
                      mb: 0.5,
                      ...(isToday && {
                      bgcolor: 'primary.main', color: 'white', borderRadius: '50%',
                      width: 28, height: 28, lineHeight: '28px', textAlign: 'center',
                      ontSize: '0.85rem'
                      })
                    }}>
                    {format(day, 'd')}
                  </Typography>

                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {dayAbsences.map(a => {
                      const typeColor = a.type === 'PERSONAL' ? '#f5576c'
                        : a.type === 'OTHER' ? '#ffa726'
                        : getEmployeeColor(a.employeeId);
                      return (
                        <Chip key={a.requestId}
                          label={a.employeeName?.split(' ')[0]}
                          size="small"
                          sx={{
                            height: 22, fontSize: '0.7rem', mb: 0.5,
                            bgcolor: typeColor, color: 'white',
                            display: 'flex', width: '100%',
                            '& .MuiChip-label': { px: 0.5 }
                          }} />
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
}