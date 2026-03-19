import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/ui';
import { useScheduleManager } from '../../../../hooks/useScheduleManager';
import { EmployeeSelector } from './components/EmployeeSelector';
import { ScheduleGrid } from './components/ScheduleGrid';
import { ScheduleForm } from './components/ScheduleForm';

export function SchedulesTab({ showSnack }) {
  const { t } = useTranslation();
  const {
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
  } = useScheduleManager(showSnack);

  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  return (
    <>
      <EmployeeSelector
        employees={employees}
        selectedEmp={selectedEmp}
        onChange={setSelectedEmp}
        loading={loadingEmp}
      />

      {!selectedEmp && (
        <Alert severity="info">
          {t('admin.schedules.selectEmployeeHint')}
        </Alert>
      )}

      {selectedEmp && (
        <ScheduleGrid
          schedules={schedules}
          loading={loadingSch}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
      )}

      <ScheduleForm
        open={dialogOpen}
        editing={editing}
        form={form}
        saving={saving}
        onFormChange={handleFormChange}
        onSave={handleSave}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('admin.schedules.delete.title')}
        description={t('admin.schedules.delete.description')}
        confirmLabel={t('common.delete')}
        confirmColor="error"
      />
    </>
  );
}