import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DateField } from '../../../../../components/ui';

export function ScheduleForm({
  open,
  editing,
  form,
  saving,
  onFormChange,
  onSave,
  onClose,
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editing
          ? t('admin.schedules.editSchedule')
          : t('admin.schedules.newSchedule')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <DateField
            label={t('admin.schedules.columns.validFrom')}
            value={form.validFrom}
            onChange={e => onFormChange('validFrom', e.target.value)}
            fullWidth
            required
          />
          <DateField
            label={t('admin.schedules.columns.validTo')}
            value={form.validTo}
            onChange={e => onFormChange('validTo', e.target.value)}
            fullWidth
            helperText={t('admin.schedules.columns.helperText')}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('admin.schedules.columns.start')}
              type="time"
              value={form.expectedStartTime}
              onChange={e => onFormChange('expectedStartTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label={t('admin.schedules.columns.end')}
              type="time"
              value={form.expectedEndTime}
              onChange={e => onFormChange('expectedEndTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Box>
          <TextField
            label={t('admin.schedules.columns.break')}
            type="number"
            value={form.breakMinutes}
            onChange={e => onFormChange('breakMinutes', +e.target.value)}
          />
          <TextField
            label={t('admin.schedules.columns.notes')}
            value={form.notes}
            onChange={e => onFormChange('notes', e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <CircularProgress size={18} /> : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
