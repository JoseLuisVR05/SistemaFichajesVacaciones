export const formatCorrectionReason = (reason = '', t) => {
  if (!reason) return '-';
  return reason
    .replace('[REJECTION_REASON]', t('corrections.rejectionPrefix'))
    .replace('[RECHAZO]', t('corrections.rejectionPrefix')); // cubre registros antiguos
};