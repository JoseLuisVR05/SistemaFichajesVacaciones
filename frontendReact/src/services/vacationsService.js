import api from './api';

// POLITICA DE VACACIONES

export const getPolicies = async (year) =>{
    const params = {};
    if (year) params.year = year;
    const { data } = await api.get ('/vacation/policies', { params });
    return data;
};

export const getPolicy = async (id) => {
    const { data } = await api.get (`/vacation/policies/${id}`);
    return data;
};

/* Crea una nueva politica de vacaciones(Solo ADMIN y RRHH)*/
export const createPolicy = async (policyData) => {
    const { data } = await api.post ('/vacation/policies', policyData);
    return data;
};

/* Actualiza una politica de vacaciones(Solo ADMIN y RRHH)*/
export const updatePolicy = async (id, policyData) => {
    const { data } = await api.post (`/vacation/policies/${id}`, policyData);
    return data;
};

/* Elimina una policitca solo si no tiene saldos asociados*/
export const deletePolicy = async (id) => {
    const { data } = await api.delete (`/vacation/policies/${id}`);
    return data;
};


// BALANCE DE VACACIONES

/* Obtiene balance de vacaciones del usuario actual o de un empleado, sin parametros
devuelve el propio y con id de empleado puede ver cualquier solo ADMIN Y RRHH, MANAGER sus subordinados*/
export const getBalance = async (params = {}) =>{
    const { data } =await api.get ('/vacation/balance', {params});
    return data;
};

/* Obtiene el balance de todo el equipo para el MANAGER y de todos para ADMIN y RRHH */
export const getTeamBalances = async (year) =>{
    const params = {};
    if (year) params.year = year;
    const { data } = await api.get ('/vacation/balance/team', {params});
    return data;
};

/* Asigna saldo de vacaciones a todos los empleados activos*/
export const bulkAssignBalances = async (assignData) => {
    const { data } = await api.post ('/vacation/balance/bulk-assign', assignData);
    return data;
};

/* Recalcula el balance de un empleado*/
export const recalculateBalance = async (employeeId, year) => {
    const { data } = await api.post ('/vacation/balance/recalculate', null, {
        params: { employeeId, year}
    });
    return data;
};


// SOLICITUDES DE VACACIONES

/* Crea una solicitud de vacaciones en estado DRAFT, 
el backend valida fechas, saldo y solapamientos*/
export const createVacationRequest = async (requestData) => {
    const { data } = await api.post('/vacation/requests', requestData);
    return data;
};

/* Lista solicitudes segun permisos del usuario*/
export const getVacationRequests = async (params = {}) => {
    const query = {};
    if (params.employeeId) query.employeeId = params.employeeId;
    if (params.status && params.status !=='ALL') query.status = params.status;
    if (params.from) query.from = params.from;
    if (params.top) query.to = params.to;
    const { data } = await api.get('/vacation/requests', { params: query});
    return data;
};

/* Envia una solicitud DRAFT para aprobacion*/
export const submitVacationRequest = async (requestId) => {
    const { data } = await api.post (`/vacation/requests/${requestId}/submit`);
    return data;
};

/* Aprueba una solicitud (solo MANAGER/RRHH/ADMIN)*/
export const approveVacationRequest = async(requestId, comment = '') => {
    const { data } = await api.post(`/vacation/requests/${requestId}/approve`,{comment});
    return data;
};

/* Rechaza una solicitud (solo MANAGER/RRHH/ADMIN)*/
export const rejectVacationRequest = async (requestId, comment) => {
    const { data } =await api.post(`/vacation/requests/${requestId}/reject`, {comment});
    return data;
};

/* Cancela una solicitud propio solo si esta en DRAFT o SUNMITED.*/
export const cancelVacationRequest = async (requestId) => {
    const { data } =await api.post (`/vacation/requests/${requestId}/cancel`);
    return data;
};

/* Muestra al usuario cuantos dias va a consumir antes de crear*/
export const validateVacationDates = async (startDate, endDate) => {
    const { data } = await api.post ('/vacation/requests/validate', {startDate, endDate});
        return data;
};