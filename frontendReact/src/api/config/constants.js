// src/config/constants.js

// ─── Roles de usuario ────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:    'ADMIN',
  RRHH:     'RRHH',
  MANAGER:  'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

// ─── Tipos de fichaje ────────────────────────────────────────────────────────
export const ENTRY_TYPES = {
  IN:  'IN',
  OUT: 'OUT',
};

// ─── Estados de corrección ───────────────────────────────────────────────────
export const CORRECTION_STATUS = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// ─── Estados de solicitud de vacaciones ─────────────────────────────────────
export const VACATION_STATUS = {
  DRAFT:     'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED:  'APPROVED',
  REJECTED:  'REJECTED',
  CANCELLED: 'CANCELLED',
};

// ─── Tipos de ausencia ───────────────────────────────────────────────────────
export const VACATION_TYPES = {
  VACATION: 'VACATION',
  PERSONAL: 'PERSONAL',
  OTHER:    'OTHER',
};

// ─── Orígenes de fichaje ─────────────────────────────────────────────────────
export const ENTRY_SOURCES = {
  WEB:    'WEB',
  MOBILE: 'MOBILE',
};