import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, parseISO, isValid } from 'date-fns';

/**
 * DateField
 * Drop-in replacement de <TextField type="date">.
 * Recibe y devuelve strings 'yyyy-MM-dd' igual que antes.
 */
export function DateField({ label, value, onChange, size, sx, fullWidth, required, helperText, error }) {

  // Convertir string 'yyyy-MM-dd' → Date para el DatePicker
  const dateValue = value ? parseISO(value) : null;

  // Convertir Date → string 'yyyy-MM-dd' para devolver al padre
  const handleChange = (newDate) => {
    if (newDate && isValid(newDate)) {
      onChange({ target: { value: format(newDate, 'yyyy-MM-dd') } });
    } else {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <DatePicker
      label={label}
      value={dateValue}
      onChange={handleChange}
      slotProps={{
        textField: {
          size: size || 'small',
          sx,
          fullWidth,
          required,
          helperText,
          error,
        },
      }}
    />
  );
}