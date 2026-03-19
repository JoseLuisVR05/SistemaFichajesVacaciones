import { useState, useEffect } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './styles/theme.js'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { es, enUS } from 'date-fns/locale';
import i18n from './i18n/i18n.js'
import './index.css'

import App from './App.jsx'

function Root() {
  const [locale, setLocale] = useState(i18n.language === 'es' ? es : enUS);

  useEffect(() => {
    i18n.on('languageChanged', (lng) => {
      setLocale(lng === 'es' ? es : enUS);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  );
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
