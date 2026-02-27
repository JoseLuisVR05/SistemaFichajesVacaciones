// src/hooks/useEmployees.js
// ─────────────────────────────────────────────────────────────────────────────
// Encapsula todo lo relacionado con empleados.
// Los componentes que necesiten empleados usan este hook,
// no llaman directamente a getEmployees().
// ─────────────────────────────────────────────────────────────────────────────
import { useFetch } from './useFetch';
import { getEmployees } from '../services/employeesService';

export function useEmployees() {
  const { data, loading, error, refetch } = useFetch(() => getEmployees());

  return {
    employees: data ?? [],
    loading,
    error,
    refetch,
  };
}