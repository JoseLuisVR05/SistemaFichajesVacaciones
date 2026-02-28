// AdminPanel.jsx — solo orquesta los tabs y el Snackbar
import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper} from '@mui/material';
import { Policy, Schedule, UploadFile, People } from '@mui/icons-material';
import { useSnackbar } from '../../hooks/useSnackbar';
import { SnackbarAlert } from '../../components/ui/SnackbarAlert';
import { PoliciesTab }  from './tabs/PoliciesTab';
import { SchedulesTab } from './tabs/SchedulesTab';
import { ImportTab }    from './tabs/ImportTab';
import { EmployeesTab } from './tabs/EmployeesTab';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function AdminPanel() {
  const [tab, setTab] = useState(0);
  const { snackbar, showSnack, closeSnack } = useSnackbar();

  
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        Panel de Administración
      </Typography>

      <Paper sx={{ px: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab icon={<Policy />}      iconPosition="start" label="Políticas Vacaciones" />
          <Tab icon={<Schedule />}    iconPosition="start" label="Horarios Empleados" />
          <Tab icon={<UploadFile />}  iconPosition="start" label="Importación CSV" />
          <Tab icon={<People />}      iconPosition="start" label="Gestión Empleados" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}><PoliciesTab  showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={1}><SchedulesTab showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={2}><ImportTab    showSnack={showSnack} /></TabPanel>
      <TabPanel value={tab} index={3}><EmployeesTab showSnack={showSnack} /></TabPanel>

      <SnackbarAlert
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnack}
      />
    </Box>
  );
}