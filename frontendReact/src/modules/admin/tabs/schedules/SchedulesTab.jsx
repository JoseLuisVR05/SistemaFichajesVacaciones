import { useState, useEffect } from 'react';
import { Alert, Box, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/ui';
import { useScheduleManager } from '../../../../hooks/useScheduleManager';
import { CalendarTemplatesTable } from './components/CalendarTemplatesTable';
import { CalendarTemplateForm } from './components/CalendarTemplateForm';
import { EmployeeScheduleAssignment } from './components/EmployeeScheduleAssignment';
import { 
  getTemplatesByTerritory, 
  createTemplate, 
  updateTemplate,
  deleteTemplate,
  assignTemplateToEmployee, 
  deleteWorkSchedule,
} from '../../../../services/scheduleService';

export function SchedulesTab({ showSnack }) {
  const { t } = useTranslation();
  const {
    employees,
    loadingEmp,
  } = useScheduleManager(showSnack);

  // Estado principal
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // Dialogs
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Cargar templates al montar (una sola vez)
  useEffect(() => {
    loadAllTemplates();
  }, []);

  const loadAllTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // Cargar templates de TODOS los territorios (sin filtro)
      const data = await getTemplatesByTerritory(null);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      showSnack?.(t('admin.schedules.messages.errorLoad'), 'error');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ================== HANDLERS TEMPLATES ==================

  const handleOpenTemplateForm = (template = null) => {
    setEditingTemplate(template);
    setTemplateFormOpen(true);
  };

  const handleCloseTemplateForm = () => {
    setTemplateFormOpen(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = async (templateData) => {
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        // Actualizar - el template tiene TerritoryId
        await updateTemplate(editingTemplate.workScheduleTemplateId, {
          ...templateData,
          territoryId: editingTemplate.territoryId  // Mantener el territorio original
        });
        showSnack?.(t('admin.schedules.messages.templateUpdated'), 'success');
      } else {
        // Crear - usar territorio por defecto (1 = España)
        await createTemplate({
          ...templateData,
          territoryId: 1,  // Default: España
          isActive: true,
        });
        showSnack?.(t('admin.schedules.messages.templateCreated'), 'success');
      }

      // Recargar todas las plantillas
      await loadAllTemplates();
      handleCloseTemplateForm();
    } catch (error) {
      console.error('Error:', error);
      showSnack?.(
        editingTemplate
          ? t('admin.schedules.messages.errorUpdate')
          : t('admin.schedules.messages.errorCreate'),
        'error'
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteTemplate(templateId);
      showSnack?.(t('admin.schedules.messages.templateDeleted'), 'success');
      await loadAllTemplates();
    } catch (error) {
      console.error('Error:', error);
      showSnack?.(t('admin.schedules.messages.errorDelete'), 'error');
    }
  };

  // ================== HANDLERS ASIGNACIÓN ==================

  const handleAssignTemplate = async (payload) => {
    try {
      const response = await assignTemplateToEmployee(payload);
      showSnack?.(t('admin.schedules.messages.templateAssigned'), 'success');
    } catch (error) {
      console.error('[SchedulesTab] Error en assign:', error?.response?.data || error?.message || error);
      showSnack?.(t('admin.schedules.messages.errorAssign'), 'error');
    }
  };

  const handleUnassignTemplate = async (workScheduleId) => {
    try {
      const response = await deleteWorkSchedule(workScheduleId);
      showSnack?.(t('admin.schedules.messages.assignmentRemoved'), 'success');
    } catch (error) {
      console.error('[SchedulesTab] Error en unassign:', error?.response?.data || error?.message || error);
      showSnack?.(t('admin.schedules.messages.errorUnassign'), 'error');
    }
  };

  return (
    <Box>
      {/* TABS */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label={`📅 ${t('admin.schedules.tabs.templates')}`} />
          <Tab label={`👥 ${t('admin.schedules.tabs.assign')}`} />
        </Tabs>
      </Box>

      {/* TAB 0: Plantillas de Horarios */}
      {currentTab === 0 && (
        <Box>
          <CalendarTemplatesTable
            templates={templates}
            loading={loadingTemplates}
            onAdd={() => handleOpenTemplateForm()}
            onEdit={handleOpenTemplateForm}
            onDelete={handleDeleteTemplate}
          />
        </Box>
      )}

      {/* TAB 1: Asignación a Empleados */}
      {currentTab === 1 && (
        <Box>
          <EmployeeScheduleAssignment
            employees={employees}
            templates={templates}
            loading={loadingEmp}
            onAssign={handleAssignTemplate}
            onUnassign={handleUnassignTemplate}
          />
        </Box>
      )}

      {/* DIALOGS */}
      <CalendarTemplateForm
        open={templateFormOpen}
        onClose={handleCloseTemplateForm}
        onSave={handleSaveTemplate}
        editingTemplate={editingTemplate}
        loading={savingTemplate}
      />
    </Box>
  );
}