import api from './api';

export async function getTerritories() {
  try {
    const response = await api.get('/territories');
    return response.data;
  } catch (error) {
    console.error('❌ Error cargando territorios:', error.response?.data || error.message);
    throw error;
  }
}

export async function getTemplatesByTerritory(territoryId) {
  try {
    // Si no hay territoryId, traer TODOS los templates (para admin)
    const endpoint = territoryId
      ? `/schedule-templates/by-territory/${territoryId}`
      : '/schedule-templates';
    
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('❌ Error cargando templates:', error.response?.data || error.message);
    throw error;
  }
}

export async function getTemplate(templateId) {
  try {
    const response = await api.get(`/schedule-templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error cargando template:', error.response?.data || error.message);
    throw error;
  }
}

export async function createTemplate(data) {
  try {
    const response = await api.post(`/schedule-templates`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creando template:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateTemplate(templateId, data) {
  try {
    const response = await api.put(`/schedule-templates/${templateId}`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error actualizando template:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteTemplate(templateId) {
  try {
    const response = await api.delete(`/schedule-templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error eliminando template:', error.response?.data || error.message);
    throw error;
  }
}

export async function assignTemplateToEmployee(data) {
  try {
    const response = await api.post(`/schedules/assign`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error asignando template:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteWorkSchedule(workScheduleId) {
  try {
    const response = await api.delete(`/schedules/${workScheduleId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error eliminando horario:', error.response?.data || error.message);
    throw error;
  }
}

export async function getEmployeeSchedules(employeeId) {
  try {
    const response = await api.get(`/schedules?employeeId=${employeeId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error cargando horarios:', error.response?.data || error.message);
    throw error;
  }
}

