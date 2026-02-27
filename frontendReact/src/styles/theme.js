// src/styles/theme.js
// ─────────────────────────────────────────────────────────────────────────────
// Theme central de MUI.
// Consume los mismos colores que variables.css para garantizar coherencia.
// Un cambio aquí afecta a TODOS los componentes MUI de la app.
// ─────────────────────────────────────────────────────────────────────────────
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  // ── Paleta de colores ──────────────────────────────────────────────────────
  palette: {
    primary: {
      main:  '#1976d2',   // --brand-primary
      light: '#42a5f5',   // --brand-primary-light
      dark:  '#1565c0',   // --brand-primary-dark
    },
    error: {
      main:  '#c62828',   // --brand-accent (rojo corporativo)
      light: '#ef5350',
      dark:  '#b71c1c',
    },
    success: {
      main:  '#2e7d32',
      light: '#4caf50',
    },
    warning: {
      main:  '#f57c00',
      light: '#ffa726',
    },
    info: {
      main:  '#0288d1',
      light: '#03a9f4',
    },
    background: {
      default: '#fafafa',  // --surface-page
      paper:   '#ffffff',  // --surface-card
    },
    text: {
      primary:   '#212121',
      secondary: '#757575',
      disabled:  '#bdbdbd',
    },
    divider: '#e0e0e0',    // --color-border
  },

  // ── Tipografía ────────────────────────────────────────────────────────────
  typography: {
    fontFamily: '"Roboto", system-ui, -apple-system, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
  },

  // ── Forma (border radius) ─────────────────────────────────────────────────
  shape: {
    borderRadius: 8,       // --border-radius-md
  },

  // ── Sobrescrituras globales de componentes MUI ────────────────────────────
  components: {

    // Paper: sin sombra por defecto, con borde sutil
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e0e0e0',
          borderRadius: 8,
        },
      },
    },

    // DataGrid: sin borde exterior, cabecera con fondo gris suave
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#fafafa',
            borderBottom: '2px solid #e0e0e0',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f5f5f5',
          },
        },
      },
    },

    // Button: sin mayúsculas automáticas
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },

    // Chip: border radius consistente
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },

    // Dialog: sombra más pronunciada
    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          border: 'none',
        },
      },
    },

    // TextField: border radius consistente
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});