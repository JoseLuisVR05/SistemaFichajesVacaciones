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

export const exportEntries = async (params = {}) =>{
  const response = await api.get('/time-entries/export', {
    params,
    responseType: 'blob'
  });

  //Enlace de descarga automatico
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  //Extraer nombre del archivo del header
  const contentDisposition = response.headers['content-disposition'];
  const fileName = contentDisposition
    ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
    : 'fichajes_export.csv';

  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}