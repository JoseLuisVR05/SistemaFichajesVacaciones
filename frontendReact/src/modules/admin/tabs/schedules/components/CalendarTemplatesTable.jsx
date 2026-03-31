import { useState } from 'react';
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

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function CalendarTemplatesTable({
  templates,
  loading,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [viewDetailId, setViewDetailId] = useState(null);
  const viewDetail = templates?.find(t => t.workScheduleTemplateId === viewDetailId);

  return (
    <>
      <Card sx={{ boxShadow: 2 }}>
        <CardHeader
          title="Plantillas de Horarios"
          action={
            <Button 
              variant="contained" 
              onClick={onAdd} 
              size="small"
              disabled={loading}
            >
              + Crear Nueva
            </Button>
          }
        />
        <CardContent>
          {/* Tabla */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : templates?.length === 0 ? (
            <Typography color="textSecondary">
              No hay plantillas. Crea la primera.
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      Por Defecto
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 140 }}>
                      Acciones
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
                        {template.isDefault ? '✅ SÍ' : ''}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          title="Ver detalles"
                          onClick={() => setViewDetailId(template.workScheduleTemplateId)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Editar"
                          onClick={() => onEdit(template)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="Eliminar"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar "${template.name}"?`)) {
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
        <DialogTitle>{viewDetail?.name} - Detalles por Día</DialogTitle>
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
                      <TableCell>Día</TableCell>
                      <TableCell align="center">Laboral</TableCell>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Fin</TableCell>
                      <TableCell>Descanso</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewDetail.dayDetails?.map((day) => (
                      <TableRow key={day.dayOfWeek}>
                        <TableCell>{DAYS_OF_WEEK[day.dayOfWeek]}</TableCell>
                        <TableCell align="center">
                          {day.isWorkDay ? 'Sí' : 'No'}
                        </TableCell>
                        <TableCell>{day.expectedStartTime || '—'}</TableCell>
                        <TableCell>{day.expectedEndTime || '—'}</TableCell>
                        <TableCell>{day.breakMinutes ?? 0} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailId(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
