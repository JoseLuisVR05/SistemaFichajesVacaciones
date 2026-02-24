// services/adminService.js
import api from './api';

// HORARIOS DE TRABAJO 

export const getWorkSchedules = async (employeeId) => {
    const { data } = await api.get(`/work-schedules/${employeeId}`);
    return data;
};

export const createWorkSchedule = async (employeeId, scheduleData) => {
    const { data } = await api.post(`/work-schedules/${employeeId}`, scheduleData);
    return data;
};

export const updateWorkSchedule = async (id, scheduleData) => {
    const { data } = await api.put(`/work-schedules/${id}`, scheduleData);
    return data;
};

export const deleteWorkSchedule = async (id) => {
    const { data } = await api.delete(`/work-schedules/${id}`);
    return data;
};

// ESTADO DE EMPLEADO

export const toggleEmployeeStatus = async (employeeId, isActive) => {
    const { data } = await api.patch(`/employees/${employeeId}/status`, { isActive });
    return data;
};

// IMPORTACIÓN CSV 

export const importEmployeesCsv = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
};

export const getImportHistory = async (page = 1, pageSize = 20) => {
    const { data } = await api.get('/import/runs', { params: { page, pageSize } });
    return data;
};

export const getImportErrors = async (runId) => {
    const { data } = await api.get(`/import/runs/${runId}/errors`);
    return data;
};