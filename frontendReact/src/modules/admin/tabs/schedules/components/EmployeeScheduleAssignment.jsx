import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Typography,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { searchEmployees } from '../../../../../services/employeesService';

export function EmployeeScheduleAssignment({
  templates,
  onAssign,
  onUnassign,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const debounceTimer = useRef(null);

  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setSelectedTemplateId(
      employee.workSchedule?.workScheduleTemplateId || ''
    );
  };

  // Buscar empleados con debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoadingSearch(true);
    setHasSearched(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchEmployees(searchTerm);
        setSearchResults(results || []);
      } catch (error) {
        console.error('Employee search error:', error);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  const handleSaveAssignment = async () => {
    if (!editingEmployee) return;

    if (!selectedTemplateId) {
      alert(t('admin.schedules.assignment.alertSelectTemplate'));
      return;
    }

    const payload = {
      employeeId: editingEmployee.employeeId,
      workScheduleTemplateId: selectedTemplateId,
    };
    await onAssign(payload);

    setEditingEmployee(null);

    if (searchTerm.trim()) {
      try {
        const results = await searchEmployees(searchTerm);
        setSearchResults(results || []);
      } catch (err) { console.error(err); }
    }
  };

  const handleRemoveAssignment = async () => {
    if (!editingEmployee?.workSchedule) {
      alert(t('admin.schedules.assignment.alertNoTemplate'));
      return;
    }

    if (editingEmployee.workSchedule.isDefault) {
      alert(t('admin.schedules.assignment.alertIsDefault'));
      return;
    }

    if (!editingEmployee.workSchedule.workScheduleId) {
      alert(t('admin.schedules.assignment.alertNoException'));
      return;
    }

    if (window.confirm(t('admin.schedules.assignment.confirmResetDefault'))) {
      await onUnassign(editingEmployee.workSchedule.workScheduleId);
      setEditingEmployee(null);

      if (searchTerm.trim()) {
        try {
          const results = await searchEmployees(searchTerm);
          setSearchResults(results || []);
        } catch (err) { console.error(err); }
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader title={`👥 ${t('admin.schedules.assignment.title')}`} />
        <CardContent>
          <TextField
            placeholder={t('admin.schedules.assignment.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />

          {loadingSearch ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : !hasSearched ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', p: 2 }}>
              {t('admin.schedules.assignment.searchHint')}
            </Typography>
          ) : searchResults.length === 0 ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', p: 2 }}>
              {t('admin.schedules.assignment.noResults')}
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('admin.schedules.assignment.colName')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('admin.schedules.assignment.colEmail')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {t('admin.schedules.assignment.colTemplate')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('admin.schedules.assignment.colDefault')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {t('common.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((emp) => (
                    <TableRow key={emp.employeeId} hover>
                      <TableCell>{emp.fullName}</TableCell>
                      <TableCell>{emp.email || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 500, color: emp.workSchedule?.name ? 'inherit' : '#999' }}>
                        {emp.workSchedule?.name || emp.workSchedule?.description || t('admin.schedules.assignment.noTemplate')}
                      </TableCell>
                      <TableCell>
                        {emp.workSchedule?.isDefault ? '✅' : ''}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(emp)}
                          title={t('admin.schedules.assignment.tooltipChange')}
                        >
                          <EditIcon fontSize="small" />
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

      {/* Dialog: Cambiar plantilla del empleado */}
      <Dialog
        open={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('admin.schedules.assignment.dialogTitle', { name: editingEmployee?.fullName })}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {editingEmployee?.workSchedule?.name && (
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  📋 {t('admin.schedules.assignment.currentTemplate', { name: editingEmployee.workSchedule.name })}
                </Typography>
                {editingEmployee.workSchedule.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {editingEmployee.workSchedule.description}
                  </Typography>
                )}
                {editingEmployee.workSchedule.hours && (
                  <Typography variant="body2">
                    ⏰ {editingEmployee.workSchedule.hours}
                  </Typography>
                )}
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                {t('admin.schedules.assignment.assignNew')}
              </Typography>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">{t('admin.schedules.assignment.selectTemplate')}</MenuItem>
                {templates?.map((tmpl) => (
                  <MenuItem key={tmpl.workScheduleTemplateId} value={tmpl.workScheduleTemplateId}>
                    {tmpl.name} {tmpl.isDefault ? '(DEFAULT)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={handleRemoveAssignment}
            disabled={editingEmployee?.workSchedule?.isDefault}
          >
            {t('admin.schedules.assignment.btnResetDefault')}
          </Button>
          <Button onClick={() => setEditingEmployee(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveAssignment}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
