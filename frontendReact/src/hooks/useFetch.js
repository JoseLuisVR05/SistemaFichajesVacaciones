// src/hooks/useFetch.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook genérico para cualquier llamada a la API.
// Gestiona loading, error y data en un solo lugar.
//
// Uso básico:
//   const { data, loading, error, refetch } = useFetch(() => getEmployees());
//
// Con dependencias (se re-ejecuta cuando cambian):
//   const { data } = useFetch(() => getCorrections(params), [params.status]);
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch(fetchFn, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // useRef para evitar actualizaciones de estado en componentes desmontados
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        console.error('useFetch error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}