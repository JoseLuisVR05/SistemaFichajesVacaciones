import { useState, useEffect, useRef } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const debounceTimer = useRef(null);

  const handleOpenEdit = (employee) => {
    console.log('[EDIT] Abriendo dialog para:', {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      workSchedule: employee.workSchedule,
      workScheduleId: employee.workSchedule?.workScheduleId,
      workScheduleTemplateId: employee.workSchedule?.workScheduleTemplateId,
      isDefault: employee.workSchedule?.isDefault,
      isException: employee.workSchedule?.isException,
      name: employee.workSchedule?.name,
    });
    setEditingEmployee(employee);
    setSelectedTemplateId(
      employee.workSchedule?.workScheduleTemplateId || ''
    );
    console.log('[EDIT] selectedTemplateId set to:', employee.workSchedule?.workScheduleTemplateId || '(vacío)');
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
        console.log('[SEARCH] Resultados raw:', JSON.stringify(results?.map(r => ({
          id: r.employeeId,
          name: r.fullName,
          ws: r.workSchedule,
        })), null, 2));
        setSearchResults(results || []);
      } catch (error) {
        console.error('Error en búsqueda:', error);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 500); // Espera 500ms después de que el usuario deja de escribir

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  const handleSaveAssignment = async () => {
    if (!editingEmployee) return;

    if (!selectedTemplateId) {
      alert('Selecciona una plantilla');
      return;
    }

    const payload = {
      employeeId: editingEmployee.employeeId,
      workScheduleTemplateId: selectedTemplateId,
    };
    console.log('[SAVE] Payload que se envía a onAssign:', payload);
    await onAssign(payload);
    console.log('[SAVE] onAssign completado');

    setEditingEmployee(null);

    // Refrescar resultados de búsqueda
    if (searchTerm.trim()) {
      try {
        const results = await searchEmployees(searchTerm);
        setSearchResults(results || []);
      } catch (err) { console.error(err); }
    }
  };

  const handleRemoveAssignment = async () => {
    console.log('[REMOVE] editingEmployee:', {
      employeeId: editingEmployee?.employeeId,
      workSchedule: editingEmployee?.workSchedule,
    });

    if (!editingEmployee?.workSchedule) {
      alert('Este empleado no tiene plantilla asignada');
      return;
    }

    console.log('[REMOVE] isDefault:', editingEmployee.workSchedule.isDefault);
    if (editingEmployee.workSchedule.isDefault) {
      alert('Ya tiene la plantilla por defecto de su territorio');
      return;
    }

    // Solo se puede "volver a default" si tiene una excepción (workScheduleId != null)
    console.log('[REMOVE] workScheduleId:', editingEmployee.workSchedule.workScheduleId);
    if (!editingEmployee.workSchedule.workScheduleId) {
      alert('No hay excepción que eliminar');
      return;
    }

    if (window.confirm('¿Volver a la plantilla por defecto del territorio?')) {
      console.log('[REMOVE] Llamando onUnassign con workScheduleId:', editingEmployee.workSchedule.workScheduleId);
      await onUnassign(editingEmployee.workSchedule.workScheduleId);
      setEditingEmployee(null);

      // Refrescar resultados
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
        <CardHeader title="👥 Asignación de Plantillas a Empleados" />
        <CardContent>
          {/* Buscador */}
          <TextField
            placeholder="Buscar por nombre, ID o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />

          {/* Tabla */}
          {loadingSearch ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : !hasSearched ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', p: 2 }}>
              Ingresa nombre, email o ID del empleado para buscar
            </Typography>
          ) : searchResults.length === 0 ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', p: 2 }}>
              No se encontraron empleados con ese criterio
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      Plantilla Actual
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Por Defecto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((emp) => (
                    <TableRow key={emp.employeeId} hover>
                      <TableCell>{emp.fullName}</TableCell>
                      <TableCell>{emp.email || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 500, color: emp.workSchedule?.name ? 'inherit' : '#999' }}>
                        {emp.workSchedule?.name || emp.workSchedule?.description || 'Sin asignar'}
                      </TableCell>
                      <TableCell>
                        {emp.workSchedule?.isDefault ? '✅' : ''}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(emp)}
                          title="Cambiar plantilla"
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
        <DialogTitle>Cambiar Plantilla - {editingEmployee?.fullName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Plantilla actual */}
            {editingEmployee?.workSchedule?.name && (
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  📋 Plantilla Actual: {editingEmployee.workSchedule.name}
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

            {/* Selector de nueva plantilla */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Asignar Nueva Plantilla
              </Typography>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">Selecciona una plantilla...</MenuItem>
                {templates?.map((t) => (
                  <MenuItem key={t.workScheduleTemplateId} value={t.workScheduleTemplateId}>
                    {t.name} {t.isDefault ? '(DEFAULT)' : ''}
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
            Volver a Default
          </Button>
          <Button onClick={() => setEditingEmployee(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveAssignment}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
