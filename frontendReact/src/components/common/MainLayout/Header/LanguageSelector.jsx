import { useTranslation } from 'react-i18next';
import { Button, Box } from '@mui/material';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    // i18next-browser-languagedetector lo guarda en localStorage automáticamente
  };

  const isActive = (lang) => i18n.language === lang;

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button
        size="small"
        variant={isActive('en') ? 'contained' : 'outlined'}
        onClick={() => changeLanguage('en')}
        sx={{ minWidth: 40, px: 1, py: 0.5, fontSize: '0.75rem' }}
      >
        EN
      </Button>
      <Button
        size="small"
        variant={isActive('es') ? 'contained' : 'outlined'}
        onClick={() => changeLanguage('es')}
        sx={{ minWidth: 40, px: 1, py: 0.5, fontSize: '0.75rem' }}
      >
        ES
      </Button>
    </Box>
  );
}