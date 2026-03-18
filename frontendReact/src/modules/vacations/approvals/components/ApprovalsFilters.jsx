// src/modules/vacations/approvals/components/ApprovalsFilters.jsx
import {
  Box, Paper, TextField, MenuItem,
  Button, CircularProgress, Autocomplete,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DateField } from '../../../../components/ui';

/**
 * ApprovalsFilters
 * Barra de filtros de la bandeja de aprobaciones.
 */
export function ApprovalsFilters({
  statusFilter,     onStatusFilterChange,
  selectedEmployee, onEmployeeChange,
  fromDate,         onFromDateChange,
  toDate,           onToDateChange,
  departmentFilter, onDepartmentFilterChange,
  employees, loadingEmployees, departments,
  onSearch,
}) {
  const { t } = useTranslation();
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Autocomplete
          options={employees}
          getOptionLabel={(option) => `${option.fullName} (${option.employeeCode})`}
          value={selectedEmployee}
          onChange={(_, newValue) => onEmployeeChange(newValue)}
          loading={loadingEmployees}
          size="small" sx={{ minWidth: 250 }}
          renderInput={(params) => (
            <TextField {...params} label={t('vacations.approvals.columns.employee')} placeholder={t('employees.search')}
              InputProps={{ ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingEmployees ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <TextField
          select label={t('common.statusLabel')} value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">{t('common.status.all')}</MenuItem>
          <MenuItem value="SUBMITTED">{t('common.status.submitted')}</MenuItem>
          <MenuItem value="APPROVED">{t('common.status.approved')}</MenuItem>
          <MenuItem value="REJECTED">{t('common.status.rejected')}</MenuItem>
        </TextField>
        <DateField
          label={t('vacations.approvals.columns.from')} 
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          size="small"
        />
        <DateField
          label={t('vacations.approvals.columns.to')} 
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          size="small"
        />
        <TextField
          select label={t('employees.columns.department')} value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">{t('common.status.all')}</MenuItem>
          {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<Search />} onClick={onSearch}>
          {t('common.search')}
        </Button>
      </Box>
    </Paper>
  );
}