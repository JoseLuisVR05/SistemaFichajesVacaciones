import api from './api';

export const getSchedules = async (employeeId) => {
  const { data } = await api.get('/schedules', { params: { employeeId } });
  return data;
};

export const createSchedule = async (scheduleData) => {
  const { data } = await api.post('/schedules', scheduleData);
  return data;
};

export const updateSchedule = async (id, scheduleData) => {
  const { data } = await api.put(`/schedules/${id}`, scheduleData);
  return data;
};

export const deleteSchedule = async (id) => {
  const { data } = await api.delete(`/schedules/${id}`);
  return data;
};