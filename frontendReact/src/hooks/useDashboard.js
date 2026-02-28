// src/hooks/useDashboard.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDailySummary, getEntries, registerEntry } from '../services/timeService';
import { getCorrections } from '../services/correctionsService';
import { getBalance, getVacationRequests } from '../services/vacationsService';

export function useDashboard() {
  const { user } = useAuth();

  // ── Estados de datos ───────────────────────────────────
  const [lastEntries, setLastEntries]           = useState([]);
  const [todaySummary, setTodaySummary]         = useState(null);
  const [weekBalance, setWeekBalance]           = useState(null);
  const [loadingData, setLoadingData]           = useState(true);
  const [pendingCorrections, setPendingCorrections] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [vacationBalance, setVacationBalance]   = useState(null);
  const [lastRequests, setLastRequests]         = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Últimas entradas
      const entries = await getEntries();
      setLastEntries(entries.slice(0, 5));

      // Resumen de hoy
      const today = new Date().toISOString().split('T')[0];
      const summaryData = await getDailySummary({ from: today, to: today });
      if (summaryData?.length > 0) setTodaySummary(summaryData[0]);

      // Balance semanal — calculamos el lunes de esta semana
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const mondayStr = monday.toISOString().split('T')[0];
      const weekData = await getDailySummary({ from: mondayStr, to: today });
      if (weekData?.length > 0) {
        const total = weekData.reduce((acc, day) => acc + (day.balanceHours ?? 0), 0);
        setWeekBalance(Math.round(total * 100) / 100);
      }

      // Correcciones pendientes propias
      try {
        const corrections = await getCorrections({ status: 'PENDING', includeOwn: true });
        const myOwn = (Array.isArray(corrections) ? corrections : [])
          .filter(c => c.employeeId === user?.employeeId);
        setPendingCorrections(myOwn.length);
      } catch {
        setPendingCorrections(0);
      }

      // Vacaciones pendientes propias
      try {
        const pendingVac = await getVacationRequests({ status: 'SUBMITTED' });
        const myOwn = (Array.isArray(pendingVac) ? pendingVac : [])
          .filter(v => v.employeeId === user?.employeeId);
        setPendingApprovals(myOwn.length);
      } catch {
        setPendingApprovals(0);
      }

      // Saldo de vacaciones
      try {
        setVacationBalance(await getBalance());
      } catch {
        setVacationBalance(null);
      }

      // Últimas solicitudes propias
      try {
        const requests = await getVacationRequests({});
        const myOwn = (Array.isArray(requests) ? requests : [])
          .filter(v => v.employeeId === user?.employeeId);
        setLastRequests(myOwn.slice(0, 3));
      } catch {
        setLastRequests([]);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user?.employeeId]);

  // Carga inicial + refresco cada minuto
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return {
    lastEntries,
    todaySummary,
    weekBalance,
    loadingData,
    pendingCorrections,
    pendingApprovals,
    vacationBalance,
    lastRequests,
    loadDashboardData,
  };
}