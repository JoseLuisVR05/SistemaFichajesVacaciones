// src/hooks/useVacationApprovals.js
import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useRole } from './useRole';
import {
  getVacationRequests,
  approveVacationRequest,
  rejectVacationRequest,
} from '../services/vacationsService';
import { getEmployees } from '../services/employeesService';
import { toLocalDate } from '../utils/helpers/dateUtils';

export function useVacationApprovals() {
  const { user } = useAuth();
  const { hasRole } = useRole();

  // ── Datos ─────────────────────────────────────────────
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filtros ───────────────────────────────────────────
  const [statusFilter, setStatusFilter]         = useState('SUBMITTED');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(
    format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd')
  );
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // ── Empleados (para el selector de filtro) ────────────
  const [employees, setEmployees]             = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [departments, setDepartments]         = useState([]);

  // Cargamos empleados solo al montar — no cambian con los filtros
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const data = await getEmployees();
        setEmployees(data || []);
        const depts = [...new Set((data || []).map(e => e.department).filter(Boolean))];
        setDepartments(depts);
      } catch (err) {
        console.error('Error cargando empleados:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, []);

  // ── Cargar solicitudes ─────────────────────────────────
  // useCallback con todas las dependencias: se re-ejecuta solo cuando cambia un filtro
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (selectedEmployee)       params.employeeId = selectedEmployee.employeeId;
      if (fromDate)               params.from = fromDate;
      if (toDate)                 params.to = toDate;

      let data = await getVacationRequests(params);

      // Los Managers no ven sus propias solicitudes en la bandeja
      if (data && hasRole(['MANAGER']) && !hasRole(['ADMIN', 'RRHH'])) {
        data = data.filter(r => r.employeeId !== user?.employeeId);
      }

      // Filtro de departamento local (el backend no lo soporta)
      if (departmentFilter !== 'ALL' && data) {
        data = data.filter(r => r.department === departmentFilter);
      }

      // Transformación de datos: el componente recibe las fechas ya formateadas
      setRows(
        (data || []).map(r => ({
          id: r.requestId,
          ...r,
          startFormatted: r.startDate
            ? format(toLocalDate(r.startDate), 'dd/MM/yyyy', { locale: es })
            : '-',
          endFormatted: r.endDate
            ? format(toLocalDate(r.endDate), 'dd/MM/yyyy', { locale: es })
            : '-',
          createdFormatted: r.createdAt
            ? format(toLocalDate(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
            : '-',
        }))
      );
    } catch (err) {
      console.error('Error cargando aprobaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedEmployee, fromDate, toDate, departmentFilter]);

  // Se ejecuta cada vez que loadData cambia (es decir, cuando cambia un filtro)
  useEffect(() => { loadData(); }, [loadData]);

  // ── Acciones — lanzan la API y recargan ───────────────
  const approve = useCallback(async (requestId) => {
    await approveVacationRequest(requestId);
    await loadData();
  }, [loadData]);

  const reject = useCallback(async (requestId, comment) => {
    await rejectVacationRequest(requestId, comment);
    await loadData();
  }, [loadData]);

  return {
    // Datos
    rows,
    loading,
    // Filtros (valor + setter para que el componente pueda cambiarlos)
    statusFilter,     setStatusFilter,
    selectedEmployee, setSelectedEmployee,
    fromDate,         setFromDate,
    toDate,           setToDate,
    departmentFilter, setDepartmentFilter,
    // Empleados para el selector
    employees,
    loadingEmployees,
    departments,
    // Funciones
    loadData,
    approve,
    reject,
  };
}