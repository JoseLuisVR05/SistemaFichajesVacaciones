import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip,
  TextField, MenuItem
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRole } from '../../../hooks/useRole';
import { getEmployees } from '../../../services/employeesService';
import { getAbsenceCalendar } from '../../../services/vacationsService';
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { MonthGrid, TYPE_COLOR } from './components/MonthGrid';



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
              <Box 
                key={m} 
                sx={{
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