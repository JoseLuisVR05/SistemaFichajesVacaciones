// src/hooks/useCorrections.js
// ─────────────────────────────────────────────────────────────────────────────
// Encapsula fetch, aprobación y rechazo de correcciones.
// El componente no necesita saber cómo se llama la API.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { useFetch } from './useFetch';
import {
  getCorrections,
  approveCorrection,
  rejectCorrection,
  createCorrection,
  updateCorrection,
  deleteCorrection,
} from '../services/correctionsService';

export function useCorrections(params = {}) {
  // Serializar params para que useFetch detecte cambios correctamente
  const paramsDep = JSON.stringify(params);

  const { data, loading, error, refetch } = useFetch(
    () => getCorrections(params),
    [paramsDep]
  );

  const approve = useCallback(async (id) => {
    await approveCorrection(id);
    refetch();
  }, [refetch]);

  const reject = useCallback(async (id, reason) => {
    await rejectCorrection(id, reason);
    refetch();
  }, [refetch]);

  const create = useCallback(async (correctionData) => {
    await createCorrection(correctionData);
    refetch();
  }, [refetch]);

  const update = useCallback(async (id, correctionData) => {
    await updateCorrection(id, correctionData);
    refetch();
  }, [refetch]);

  const remove = useCallback(async (id) => {
    await deleteCorrection(id);
    refetch();
  }, [refetch]);

  return {
    corrections: data ?? [],
    loading,
    error,
    refetch,
    approve,
    reject,
    create,
    update,
    remove,
  };
}