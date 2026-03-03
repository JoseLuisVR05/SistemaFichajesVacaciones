import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from './useRole';
import { getCorrections } from '../services/correctionsService';
import { getVacationRequests } from '../services/vacationsService';

// Clave en localStorage por usuario
const seenKey = (userId) => `notif_seen_${userId}`;

const getSeenIds = (userId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
};

const saveSeenIds = (userId, ids) => {
  localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
};

export function useNotifications() {
  const { user } = useAuth();
  const { hasRole } = useRole();

  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user?.employeeId) return;
    const seen = getSeenIds(user.employeeId);
    const items = [];

    try {
      if (hasRole(['ADMIN', 'RRHH', 'MANAGER'])) {
        // ── Manager/Admin: correcciones del equipo pendientes de aprobar
        const corrections = await getCorrections({ status: 'PENDING' });
        const teamCorrections = (Array.isArray(corrections) ? corrections : [])
          .filter(c => c.employeeId !== user.employeeId);

        const newCorrections = teamCorrections.filter(
          c => !seen.has(`correction_pending_${c.correctionId ?? c.id}`)
        );
        if (newCorrections.length > 0) {
          items.push({
            id: 'team-corrections',
            type: 'correction',
            count: newCorrections.length,
            messageKey: 'notifications.teamCorrections',
            path: '/corrections',
            // IDs para marcar como vistas al hacer clic
            itemIds: newCorrections.map(c => `correction_pending_${c.correctionId ?? c.id}`),
          });
        }

        // ── Manager/Admin: vacaciones del equipo pendientes de aprobar
        const vacations = await getVacationRequests({ status: 'SUBMITTED' });
        const teamVacations = (Array.isArray(vacations) ? vacations : [])
          .filter(v => v.employeeId !== user.employeeId);

        const newVacations = teamVacations.filter(
          v => !seen.has(`vacation_submitted_${v.requestId}`)
        );
        if (newVacations.length > 0) {
          items.push({
            id: 'team-vacations',
            type: 'vacation',
            count: newVacations.length,
            messageKey: 'notifications.teamVacations',
            path: '/vacations/approvals',
            itemIds: newVacations.map(v => `vacation_submitted_${v.requestId}`),
          });
        }
      } else {
        // ── Empleado: sus correcciones que han sido aprobadas o rechazadas
        const corrections = await getCorrections({ includeOwn: true });
        const resolved = (Array.isArray(corrections) ? corrections : []).filter(
          c => c.employeeId === user.employeeId &&
               (c.status === 'APPROVED' || c.status === 'REJECTED')
        );

        const newResolved = resolved.filter(
          c => !seen.has(`correction_${c.status}_${c.correctionId ?? c.id}`)
        );
        if (newResolved.length > 0) {
          items.push({
            id: 'my-corrections-resolved',
            type: 'correction',
            count: newResolved.length,
            messageKey: 'notifications.myCorrectionsResolved',
            path: '/corrections',
            itemIds: newResolved.map(c => `correction_${c.status}_${c.correctionId ?? c.id}`),
          });
        }

        // ── Empleado: sus vacaciones que han sido aprobadas o rechazadas
        const vacations = await getVacationRequests({ employeeId: user.employeeId });
        const resolvedVac = (Array.isArray(vacations) ? vacations : []).filter(
          v => v.status === 'APPROVED' || v.status === 'REJECTED'
        );

        const newResolvedVac = resolvedVac.filter(
          v => !seen.has(`vacation_${v.status}_${v.requestId}`)
        );
        if (newResolvedVac.length > 0) {
          items.push({
            id: 'my-vacations-resolved',
            type: 'vacation',
            count: newResolvedVac.length,
            messageKey: 'notifications.myVacationsResolved',
            path: '/vacations/requests',
            itemIds: newResolvedVac.map(v => `vacation_${v.status}_${v.requestId}`),
          });
        }
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }

    setNotifications(items);
    setCount(items.reduce((sum, n) => sum + n.count, 0));
  }, [user?.employeeId]);

  // Marca los IDs de una notificación como vistos y recarga
  const markSeen = useCallback((itemIds) => {
    if (!user?.employeeId) return;
    const seen = getSeenIds(user.employeeId);
    itemIds.forEach(id => seen.add(id));
    saveSeenIds(user.employeeId, seen);
    load();
  }, [user?.employeeId, load]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { notifications, count, markSeen, reload: load };
}