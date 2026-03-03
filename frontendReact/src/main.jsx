import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './styles/theme.js'
import i18n from './i18n/i18n.js'
import './index.css'

import App from './App.jsx'

document.documentElement.lang = i18n.language || 'en';
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
    <App />
    </ThemeProvider>
  </StrictMode>,
);
