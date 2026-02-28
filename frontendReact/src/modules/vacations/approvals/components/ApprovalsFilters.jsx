// src/modules/vacations/approvals/components/ApprovalsFilters.jsx
import {
  Box, Paper, TextField, MenuItem,
  Button, CircularProgress, Autocomplete,
} from '@mui/material';
import { Search } from '@mui/icons-material';

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
            <TextField {...params} label="Empleado" placeholder="Buscar empleado..."
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
          select label="Estado" value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          <MenuItem value="SUBMITTED">Pendientes</MenuItem>
          <MenuItem value="APPROVED">Aprobadas</MenuItem>
          <MenuItem value="REJECTED">Rechazadas</MenuItem>
        </TextField>
        <TextField
          label="Desde" type="date" value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />
        <TextField
          label="Hasta" type="date" value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />
        <TextField
          select label="Departamento" value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<Search />} onClick={onSearch}>
          Buscar
        </Button>
      </Box>
    </Paper>
  );
}