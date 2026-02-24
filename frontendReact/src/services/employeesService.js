import api from './api';

export const getEmployees = async() =>{
    const { data } = await api.get('/employees');
    return data
};

export const getEmployee = async(id) =>{
    const { data } = await api.get(`/employees/${id}`);
    return data;
};

// Req #1 – Toggle activo/inactivo (ADMIN/RRHH)
export const toggleEmployeeActive = async (id) => {
  const { data } = await api.patch(`/employees/${id}/toggle-active`);
  return data;
};

// Req #1 – Importar CSV de Axapta
export const importEmployeesCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// Req #1 – Historial de importaciones
export const getImportRuns = async (page = 1, pageSize = 20) => {
  const { data } = await api.get('/import/runs', { params: { page, pageSize } });
  return data;
};