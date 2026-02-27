// CorrectionFilters.jsx — solo renderiza los filtros, no sabe nada de la API
import {
  Box, Paper, TextField, MenuItem, Button,
  CircularProgress, Autocomplete, Typography
} from '@mui/material';
import { Search } from '@mui/icons-material';

export function CorrectionFilters({
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  statusFilter, onStatusFilterChange,
  showEmployeeFilter,
  employees, loadingEmployees,
  selectedEmployee, onEmployeeChange,
  isManager,
  onSearch,
  onClearEmployee,
}) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>

        <TextField
          label="Desde" type="date" value={fromDate}
          onChange={e => onFromDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />

        <TextField
          label="Hasta" type="date" value={toDate}
          onChange={e => onToDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />

        <TextField
          select label="Estado" value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          <MenuItem value="PENDING">Pendiente</MenuItem>
          <MenuItem value="APPROVED">Aprobada</MenuItem>
          <MenuItem value="REJECTED">Rechazada</MenuItem>
        </TextField>

        {showEmployeeFilter && (
          <Autocomplete
            options={employees}
            getOptionLabel={o => `${o.fullName} (${o.employeeCode})`}
            value={selectedEmployee}
            onChange={(_, v) => onEmployeeChange(v)}
            loading={loadingEmployees}
            size="small" sx={{ minWidth: 300 }}
            renderInput={params => (
              <TextField
                {...params}
                label={isManager ? 'Buscar subordinado' : 'Buscar empleado'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingEmployees && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.employeeId}>
                <Box>
                  <Typography variant="body2">
                    <strong>{option.fullName}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.employeeCode} • {option.department || 'Sin dept.'}
                  </Typography>
                </Box>
              </li>
            )}
          />
        )}

        <Button variant="contained" startIcon={<Search />} onClick={onSearch}>
          Buscar
        </Button>

        {selectedEmployee && (
          <Button variant="outlined" onClick={onClearEmployee}>
            Ver todas
          </Button>
        )}

      </Box>

      {selectedEmployee && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>Correcciones de:</strong> {selectedEmployee.fullName}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}