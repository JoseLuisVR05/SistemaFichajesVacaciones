
import api from './api';

// Obtener correcciones (propias o todas según rol)
// GET /api/time-corrections?employeeId=&status=&from=&to=
export const getCorrections = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.employeeId) query.append('employeeId', params.employeeId);

  const queryString = query.toString();
  const url = queryString ? `/time-corrections?${queryString}` : '/time-corrections';
  const res = await api.get(url);
  return res.data;
};

// Crear solicitud de corrección
// POST /api/time-corrections
export const createCorrection = async (correctionData) => {
  const res = await api.post('/time-corrections', correctionData);
  return res.data;
};

// Aprobar corrección (solo ADMIN/RRHH/MANAGER)
// POST /api/time-corrections/{id}/approve
export const approveCorrection = async (correctionId) => {
  const res = await api.post(`/time-corrections/${correctionId}/approve`);
  return res.data;
};

// Rechazar corrección (solo ADMIN/RRHH/MANAGER)
// POST /api/time-corrections/{id}/reject
export const rejectCorrection = async (correctionId, reason) => {
  const res = await api.post(`/time-corrections/${correctionId}/reject`, {
    rejectionReason: reason
  });
  return res.data;
};