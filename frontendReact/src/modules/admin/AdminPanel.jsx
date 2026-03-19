// AdminPanel.jsx — solo orquesta los tabs y el Snackbar
import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper} from '@mui/material';
import { Policy, Schedule, UploadFile, People } from '@mui/icons-material';
import { useSnackbar } from '../../hooks/useSnackbar';
import { SnackbarAlert } from '../../components/ui/SnackbarAlert';
import { PoliciesTab }  from './tabs/PoliciesTab';
import { SchedulesTab } from './tabs/schedules/SchedulesTab';
import { ImportTab }    from './tabs/ImportTab';
import { EmployeesTab } from './tabs/EmployeesTab';
import { useTranslation } from 'react-i18next';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function AdminPanel() {
  const [tab, setTab] = useState(0);
  const { snackbar, showSnack, closeSnack } = useSnackbar();
  const { t } = useTranslation();
  
  return (
    <Box>
      <Typography variant="h4" textAlign="center" gutterBottom>
        {t('admin.title')}
      </Typography>

      <Paper sx={{ px: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<Policy />}      iconPosition="start" label={t('admin.tabs.policies')} />

          <Tab icon={<Schedule />}    iconPosition="start" label={t('admin.tabs.schedules')} />
          <Tab icon={<UploadFile />}  iconPosition="start" label={t('admin.tabs.import')} />
          <Tab icon={<People />}      iconPosition="start" label={t('admin.tabs.employees')} />
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