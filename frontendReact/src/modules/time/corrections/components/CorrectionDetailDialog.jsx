import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, Alert
} from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '../../../../components/ui';
import { formatCorrectionReason } from '../../../../utils/helpers/formatCorrections';
import { toLocalDate } from '../../../../utils/helpers/dateUtils';

export function CorrectionDetailDialog({ open, correction, onClose }) {
  const { t } = useTranslation();

  if (!correction) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('corrections.detail.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Typography>
            <strong>{t('corrections.columns.date')}:</strong>{' '}
            {correction.date
              ? format(toLocalDate(correction.date), 'dd/MM/yyyy', { locale: es })
              : '-'}
          </Typography>
          <Typography>
            <strong>{t('corrections.columns.originalMinutes')}:</strong>{' '}
            {correction.originalMinutes != null
              ? `${Math.floor(Math.abs(correction.originalMinutes) / 60)}h ${Math.abs(correction.originalMinutes) % 60}m`
              : '-'}
          </Typography>
          <Typography>
            <strong>{t('corrections.columns.correctedMinutes')}:</strong>{' '}
            {correction.correctedMinutes != null
              ? `${Math.floor(Math.abs(correction.correctedMinutes) / 60)}h ${Math.abs(correction.correctedMinutes) % 60}m`
              : '-'}
          </Typography>
          <Typography>
            <strong>{t('corrections.columns.reason')}:</strong>{' '}
            {formatCorrectionReason(correction.reason, t)}
          </Typography>
          <Typography component="div">
            <strong>{t('common.statusLabel')}:</strong>{' '}
            <StatusChip status={correction.status} />
          </Typography>
          {correction.employeeName && (
            <Typography>
              <strong>{t('corrections.columns.employee')}:</strong>{' '}
              {correction.employeeName}
            </Typography>
          )}
          <Typography>
            <strong>{t('corrections.columns.created')}:</strong>{' '}
            {correction.createdAt
              ? new Date(correction.createdAt + (correction.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString()
              : '-'}
          </Typography>
          {correction.rejectionReason && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <strong>{t('corrections.detail.rejectionReason')}:</strong>{' '}
              {correction.rejectionReason}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}