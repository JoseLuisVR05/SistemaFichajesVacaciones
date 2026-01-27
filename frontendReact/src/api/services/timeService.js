import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5035/api/time-entries';
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export const registerEntry = async (entryType, comment = '') => {
  const { data } = await axios.post(API_URL, { entryType, comment }, { headers: headers() });
  return data;
};

export const getEntries = async (employeeId, from, to) => {
  const { data } = await axios.get(API_URL, { params: { employeeId, from, to }, headers: headers() });
  return data;
};

export const getDailySummary = async (employeeId, from, to) => {
  const { data } = await axios.get(`${API_URL}/summary/daily`, { params: { employeeId, from, to }, headers: headers() });
  return data;
};