import { Box, TextField, CircularProgress, Autocomplete, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function EmployeeSelector({ 
  employees, 
  selectedEmp, 
  onChange, 
  loading 
}) {
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Autocomplete
        options={employees}
        getOptionLabel={o => `${o.fullName} (${o.employeeCode})`}
        value={selectedEmp}
        onChange={(_, v) => onChange(v)}
        loading={loading}
        size="small"
        sx={{ maxWidth: 400 }}
        renderInput={params => (
          <TextField
            {...params} 
            label={t('admin.schedules.selectEmployee')}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Paper>
  );
}
