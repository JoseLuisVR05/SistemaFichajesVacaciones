// src/hooks/useHistory.js
import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRole } from './useRole';
import { getEntries, exportEntries } from '../services/timeService';
import { getEmployees } from '../services/employeesService';
import { toLocalDate } from '../utils/helpers/dateUtils';

export function useHistory() {
  const { canViewEmployees } = useRole();

  // ── Datos ─────────────────────────────────────────────
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Empleados (para el selector de managers/RRHH) ─────
  const [employees, setEmployees]               = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // ── Filtros ───────────────────────────────────────────
  const [fromDate, setFromDate]     = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Cargamos empleados solo si el usuario tiene permisos
  useEffect(() => {
    if (!canViewEmployees()) return;
    setLoadingEmployees(true);
    getEmployees()
      .then(data => setEmployees(data || []))
      .catch(err => console.error('Error cargando empleados:', err))
      .finally(() => setLoadingEmployees(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar — canViewEmployees es estable

  // ── Cargar fichajes ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = { from: fromDate, to: toDate };
      let allData = [];

      if (selectedEmployees.length > 0) {
        // Pedimos en paralelo los fichajes de cada empleado seleccionado
        const results = await Promise.all(
          selectedEmployees.map(emp => getEntries({ ...baseParams, employeeId: emp.employeeId }))
        );
        allData = results.flat();
      } else {
        allData = await getEntries(baseParams);
      }

      // Filtro local por tipo
      if (typeFilter !== 'ALL') {
        allData = (allData || []).filter(entry => entry.entryType === typeFilter);
      }

      // Transformamos los datos: el componente recibe las fechas ya formateadas
      setRows(
        (allData || []).map((entry, idx) => ({
          id: entry.timeEntryId || idx,
          ...entry,
          dateFormatted: entry.eventTime
            ? format(toLocalDate(entry.eventTime), 'dd/MM/yyyy', { locale: es })
            : '-',
          timeFormatted: entry.eventTime
            ? format(toLocalDate(entry.eventTime), 'HH:mm:ss', { locale: es })
            : '-',
        }))
      );
    } catch (err) {
      console.error('Error cargando histórico:', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, typeFilter, selectedEmployees]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Exportar ───────────────────────────────────────────
  const exportData = useCallback(async () => {
    try {
      const params = { from: fromDate, to: toDate };
      if (typeFilter !== 'ALL') params.entryType = typeFilter;
      if (selectedEmployees.length === 1) params.employeeId = selectedEmployees[0].employeeId;
      await exportEntries(params);
    } catch (err) {
      console.error('Error exportando:', err);
    }
  }, [fromDate, toDate, typeFilter, selectedEmployees]);

  return {
    // Datos
    rows,
    loading,
    // Empleados
    employees,
    loadingEmployees,
    selectedEmployees, setSelectedEmployees,
    // Filtros
    fromDate,    setFromDate,
    toDate,      setToDate,
    typeFilter,  setTypeFilter,
    // Funciones
    loadData,
    exportData,
  };
}