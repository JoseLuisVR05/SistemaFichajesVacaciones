// src/hooks/useVacations.js
import { useCallback } from 'react';
import { useFetch } from './useFetch';
import {
  getVacationRequests,
  approveVacationRequest,
  rejectVacationRequest,
  cancelVacationRequest,
  submitVacationRequest,
  createVacationRequest,
  getBalance,
} from '../services/vacationsService';

export function useVacationRequests(params = {}) {
  const paramsDep = JSON.stringify(params);

  const { data, loading, error, refetch } = useFetch(
    () => getVacationRequests(params),
    [paramsDep]
  );

  const approve = useCallback(async (id) => {
    await approveVacationRequest(id);
    refetch();
  }, [refetch]);

  const reject = useCallback(async (id, comment) => {
    await rejectVacationRequest(id, comment);
    refetch();
  }, [refetch]);

  const cancel = useCallback(async (id) => {
    await cancelVacationRequest(id);
    refetch();
  }, [refetch]);

  const submit = useCallback(async (id) => {
    await submitVacationRequest(id);
    refetch();
  }, [refetch]);

  const create = useCallback(async (requestData) => {
    const result = await createVacationRequest(requestData);
    refetch();
    return result;
  }, [refetch]);

  return {
    requests: data ?? [],
    loading,
    error,
    refetch,
    approve,
    reject,
    cancel,
    submit,
    create,
  };
}

export function useVacationBalance(year) {
  const { data, loading, refetch } = useFetch(
    () => getBalance({ year }),
    [year]
  );

  return {
    balance: data,
    loading,
    refetch,
  };
}