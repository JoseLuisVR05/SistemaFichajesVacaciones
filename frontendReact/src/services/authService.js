import api from './api';

export const login = async (email, password) => {
  const { data } = await api.post(`/Auth/login`, { email, password });
  localStorage.setItem('token', data.token);//Almacenamiento persistente del token en el localStorage y lo guarda en la variable data
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const logout = () => { 
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};