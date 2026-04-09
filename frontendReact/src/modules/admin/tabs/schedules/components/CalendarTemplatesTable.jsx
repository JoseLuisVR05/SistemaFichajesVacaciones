import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  Button,
  Box,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

export function CalendarTemplatesTable({
  templates,
  loading,
  onAdd,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const [viewDetailId, setViewDetailId] = useState(null);
  const viewDetail = templates?.find(t => t.workScheduleTemplateId === viewDetailId);

  return (
    <>
      <Card sx={{ boxShadow: 2 }}>
        <CardHeader
          title={t('admin.schedules.templatesTable.title')}
          action={
            <Button
              variant="contained"
              onClick={onAdd}
              size="small"
              disabled={loading}
            >
              {t('admin.schedules.templatesTable.btnCreate')}
            </Button>
          }
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : templates?.length === 0 ? (
            <Typography color="textSecondary">
              {t('admin.schedules.templatesTable.empty')}
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('admin.schedules.templatesTable.colName')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('admin.schedules.templatesTable.colDescription')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {t('admin.schedules.templatesTable.colDefault')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 140 }}>
                      {t('common.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.workScheduleTemplateId} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {template.name}
                      </TableCell>
                      <TableCell>{template.description || '—'}</TableCell>
                      <TableCell align="center">
                        {template.isDefault ? `✅ ${t('admin.schedules.templatesTable.isDefault')}` : ''}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          title={t('admin.schedules.templatesTable.tooltipView')}
                          onClick={() => setViewDetailId(template.workScheduleTemplateId)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title={t('admin.schedules.templatesTable.tooltipEdit')}
                          onClick={() => onEdit(template)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title={t('admin.schedules.templatesTable.tooltipDelete')}
                          onClick={() => {
                            if (window.confirm(t('admin.schedules.templatesTable.confirmDelete', { name: template.name }))) {
                              onDelete(template.workScheduleTemplateId);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Ver detalles de template */}
      <Dialog open={Boolean(viewDetail)} onClose={() => setViewDetailId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('admin.schedules.templatesTable.detailTitle', { name: viewDetail?.name })}
        </DialogTitle>
        <DialogContent>
          {viewDetail && (
            <Box sx={{ mt: 2 }}>
              {viewDetail.description && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {viewDetail.description}
                </Typography>
              )}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>{t('admin.schedules.templateForm.colDay')}</TableCell>
                      <TableCell align="center">{t('admin.schedules.templatesTable.colWorkday')}</TableCell>
                      <TableCell>{t('admin.schedules.templateForm.colStart')}</TableCell>
                      <TableCell>{t('admin.schedules.templateForm.colEnd')}</TableCell>
                      <TableCell>{t('admin.schedules.templatesTable.colBreak')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewDetail.dayDetails?.map((day) => (
                      <TableRow key={day.dayOfWeek}>
                        <TableCell>{t(`admin.schedules.templateForm.days.${day.dayOfWeek}`)}</TableCell>
                        <TableCell align="center">
                          {day.isWorkDay
                            ? t('admin.schedules.templatesTable.yes')
                            : t('admin.schedules.templatesTable.no')}
                        </TableCell>
                        <TableCell>{day.expectedStartTime || '—'}</TableCell>
                        <TableCell>{day.expectedEndTime || '—'}</TableCell>
                        <TableCell>{day.breakMinutes ?? 0} {t('admin.schedules.templatesTable.minutes')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailId(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
