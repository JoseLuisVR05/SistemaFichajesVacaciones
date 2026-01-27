import api from './api';


export const registerEntry = async (entryType, comment = '') => {
  const { data } = await api.post(`/time-entries`, { entryType, comment });
  return data;
};

export const getEntries = async (params = {}) => {
  const { data } = await api.get(`/time-entries`, { params });
  return data;
};

export const getDailySummary = async (params = {}) => {
  const { data } = await api.get(`/time-entries/summary/daily`, { params });
  return data;
};