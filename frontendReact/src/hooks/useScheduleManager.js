import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../services/schedulesService';
import { getEmployees } from '../services/employeesService';

const EMPTY_SCHEDULE = {
  employeeId: null,
  validFrom: format(new Date(), 'yyyy-MM-dd'),
  validTo: '',
  expectedStartTime: '09:00',
  expectedEndTime: '18:00',
  breakMinutes: 60,
  notes: '',
};

export function useScheduleManager(showSnack) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [loadingSch, setLoadingSch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Load employees on mount
  useEffect(() => {
    getEmployees()
      .then(d => setEmployees(d || []))
      .catch(() => showSnack('Error cargando empleados', 'error'))
      .finally(() => setLoadingEmp(false));
  }, [showSnack]);

  // Load schedules when employee is selected
  useEffect(() => {
    if (!selectedEmp) {
      setSchedules([]);
      return;
    }
    setLoadingSch(true);
    getSchedules(selectedEmp.employeeId)
      .then(d => setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s }))))
      .catch(() => showSnack('Error cargando horarios', 'error'))
      .finally(() => setLoadingSch(false));
  }, [selectedEmp, showSnack]);

  const reloadSchedules = async () => {
    if (!selectedEmp) return;
    const d = await getSchedules(selectedEmp.employeeId);
    setSchedules((d || []).map(s => ({ id: s.workScheduleId, ...s })));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_SCHEDULE, employeeId: selectedEmp?.employeeId });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      employeeId: row.employeeId,
      validFrom: row.validFrom?.slice(0, 10) ?? '',
      validTo: row.validTo?.slice(0, 10) ?? '',
      expectedStartTime: row.expectedStartTime ?? '09:00',
      expectedEndTime: row.expectedEndTime ?? '18:00',
      breakMinutes: row.breakMinutes,
      notes: row.notes ?? '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_SCHEDULE);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
      };
      if (editing) {
        await updateSchedule(editing.id, payload);
        showSnack('Horario actualizado');
      } else {
        await createSchedule(payload);
        showSnack('Horario creado');
      }
      closeDialog();
      await reloadSchedules();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error guardando horario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSchedule(deleteId);
      showSnack('Horario eliminado');
      setDeleteId(null);
      await reloadSchedules();
    } catch {
      showSnack('Error eliminando horario', 'error');
      setDeleteId(null);
    }
  };

  return {
    employees,
    selectedEmp,
    setSelectedEmp,
    schedules,
    loadingEmp,
    loadingSch,
    dialogOpen,
    editing,
    form,
    setForm,
    saving,
    deleteId,
    setDeleteId,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
  };
}
