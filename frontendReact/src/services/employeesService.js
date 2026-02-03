import api from './api';

export const getEmployees = async() =>{
    const { data } = await api.get('/employees');
    return data
};

export const getEmployee = async(id) =>{
    const { data } = await api.get(`/employees/${id}`);
    return data;
};