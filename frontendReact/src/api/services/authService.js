import axios from 'axios';
const API_URL = 'http://localhost:5035/api';

export const login = async (email, password) => {
  const { data } = await axios.post(`${API_URL}/Auth/login`, { email, password });
  localStorage.setItem('token', data.token);//Almacenamiento persistente del token en el localStorage y lo guarda en la variable data
  return data;
};

export const logout = () => localStorage.removeItem('token');

export const getToken = () => localStorage.getItem('token');