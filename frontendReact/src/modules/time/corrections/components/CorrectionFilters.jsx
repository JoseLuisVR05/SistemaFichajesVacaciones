// CorrectionFilters.jsx — solo renderiza los filtros, no sabe nada de la API
import {
  Box, Paper, TextField, MenuItem, Button,
  CircularProgress, Autocomplete, Typography
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export function CorrectionFilters({
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  statusFilter, onStatusFilterChange,
  showEmployeeFilter,
  employees, loadingEmployees,
  selectedEmployee, onEmployeeChange,
  isManager,
  onSearch,
  onClearEmployee
}) {

  // traducciones para los filtros
  const { t } = useTranslation();
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>

        <TextField
          label={t('history.filters.from')} type="date" value={fromDate}
          onChange={e => onFromDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />

        <TextField
          label={t('history.filters.to')} type="date" value={toDate}
          onChange={e => onToDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }} size="small"
        />

        <TextField
          select label={t('common.statusLabel')} value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          size="small" sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">{t('history.filters.all')}</MenuItem>
          <MenuItem value="PENDING">{t('common.status.pending')}</MenuItem>
          <MenuItem value="APPROVED">{t('common.status.approved')}</MenuItem>
          <MenuItem value="REJECTED">{t('common.status.rejected')}</MenuItem>
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
                label={isManager ? t('corrections.filters.subordinate') : t('corrections.filters.employee')}
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
                    {option.employeeCode} • {option.department || 'corrections.filters.noDept'}
                  </Typography>
                </Box>
              </li>
            )}
          />
        )}

        <Button variant="contained" startIcon={<Search />} onClick={onSearch}>
          {t('common.search')}
        </Button>

        {selectedEmployee && (
          <Button variant="outlined" onClick={onClearEmployee}>
            {t('corrections.filters.viewAll')}
          </Button>
        )}

      </Box>
    </Paper>
  );
}