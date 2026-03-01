// src/styles/theme.js
// ─────────────────────────────────────────────────────────────────────────────
// Theme central de MUI.
// Consume los mismos colores que variables.css para garantizar coherencia.
// Un cambio aquí afecta a TODOS los componentes MUI de la app.
//
// REGLA: Los valores de color siempre deben coincidir con un token de
// variables.css. No hardcodear colores aquí directamente.
// ─────────────────────────────────────────────────────────────────────────────
import { createTheme } from '@mui/material/styles';

// ── Tokens extraídos de variables.css ────────────────────────────────────────
// Los duplicamos aquí porque MUI no puede leer var() CSS en JS.
// Si cambias un color en variables.css, cámbialo también aquí.
const tokens = {
  // Rojo corporativo (antes era "brand-accent", ahora también es "primary")
  red900:  '#932227',   // --brand-primary-dark  / --brand-accent-dark
  red700:  '#a4262c',   // --brand-primary        / --brand-accent
  red400:  '#ef5350',   // --brand-primary-light  / --brand-accent-light
  red100:  '#ffcdd2',   // tono muy claro para fondos

  // Grises / neutros
  grey50:  '#fafafa',   // --surface-page
  grey100: '#f5f5f5',   // --surface-hover (base neutra)
  grey200: '#e0e0e0',   // --color-border
  grey400: '#bdbdbd',   // --color-border-dark
  grey600: '#757575',   // --color-text-secondary
  grey900: '#212121',   // --color-text-primary
  white:   '#ffffff',

  // Semánticos
  success: '#2e7d32',
  successLight: '#4caf50',
  warning: '#f57c00',
  warningLight: '#ffa726',
  info:    '#0288d1',
  infoLight: '#03a9f4',

  // Superficies de estado (basadas en rojo, no en azul)
  // Equivalen a --surface-hover, --surface-selected, --surface-focus en variables.css
  hoverRed:    'rgba(198, 40, 40, 0.04)',   // muy sutil, solo perceptible
  selectedRed: 'rgba(198, 40, 40, 0.08)',   // ítem seleccionado (MenuItem, Tab, NavItem)
  focusRed:    'rgba(198, 40, 40, 0.12)',   // foco de teclado y ripple
  activeRed:   'rgba(198, 40, 40, 0.16)',   // estado pressed
};

export const theme = createTheme({

  // ── PASO 2: Paleta corregida ──────────────────────────────────────────────
  palette: {

    // PRIMARY → Rojo corporativo (antes era azul MUI por defecto)
    // Esto cambia de golpe: botones sin color explícito, Tabs, TextField focus,
    // Checkbox, CircularProgress, paginación del DataGrid, etc.
    primary: {
      main:          tokens.red700,    
      light:         tokens.red400,   
      dark:          tokens.red900,    
      contrastText:  tokens.white,
    },

    // SECONDARY → Un gris neutro oscuro como contraste
    // Antes era morado MUI por defecto al no estar definido
    secondary: {
      main:         tokens.grey900,    // #212121
      light:        tokens.grey600,    // #757575
      dark:         '#000000',
      contrastText: tokens.white,
    },

    // ERROR → Mismo rojo (coherente con primary)
    error: {
      main:  tokens.red700,
      light: tokens.red400,
      dark:  tokens.red900,
    },

    success: {
      main:  tokens.success,
      light: tokens.successLight,
    },

    warning: {
      main:  tokens.warning,
      light: tokens.warningLight,
    },

    info: {
      main:  tokens.info,
      light: tokens.infoLight,
    },

    background: {
      default: tokens.grey50,    // --surface-page
      paper:   tokens.white,     // --surface-card
    },

    text: {
      primary:   tokens.grey900,   // #212121
      secondary: tokens.grey600,   // #757575
      disabled:  tokens.grey400,   // #bdbdbd
    },

    divider: tokens.grey200,        // --color-border

    // ── OBJETO ACTION: la clave para eliminar el azul en hovers y selecciones ──
    // Sin esto, MUI hereda sus propios valores basados en primary (antes azul).
    // Ahora primary ya es rojo, pero lo definimos explícitamente por claridad.
    action: {
      hover:              tokens.hoverRed,     // fondo al pasar el ratón
      hoverOpacity:       0.04,
      selected:           tokens.selectedRed,  // ítem activo en listas, Tabs, etc.
      selectedOpacity:    0.08,
      focus:              tokens.focusRed,     // foco de teclado
      focusOpacity:       0.12,
      active:             tokens.activeRed,    // pressed
      activatedOpacity:   0.16,
      disabled:           tokens.grey400,
      disabledBackground: tokens.grey100,
      disabledOpacity:    0.38,
    },
  },

  // ── Tipografía ────────────────────────────────────────────────────────────
  typography: {
    fontFamily: '"Roboto", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },

  // ── Forma ─────────────────────────────────────────────────────────────────
  shape: {
    borderRadius: 8,   // --border-radius-md
  },

  // ── PASO 3: Overrides de componentes ─────────────────────────────────────
  // Solo sobreescribimos lo que MUI no puede inferir de la paleta,
  // o casos donde necesitamos precisión extra con nuestros tokens.
  components: {
    

    // ── Paper ──────────────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.grey200}`,  // --color-border
          borderRadius: 8,                          // --border-radius-md
        },
      },
    },

    // ── Button ─────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
        // Botones outlined usan el borde del color del botón — ya heredan primary rojo
        // Solo aseguramos que el hover de outlined no quede raro
        outlinedPrimary: {
          '&:hover': {
            backgroundColor: tokens.hoverRed,
          },
        },
      },
    },

    // ── Tabs ───────────────────────────────────────────────────────────────
    // MUI colorea el indicador y el texto activo con primary.
    // Como primary ya es rojo, esto se resuelve solo.
    // Solo necesitamos ajustar el hover del Tab individual.
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: tokens.hoverRed,
            borderRadius: 8,
          },
          // El Tab activo ya coge primary.main (rojo) automáticamente
        },
      },
    },

    // ── TextField / Input ──────────────────────────────────────────────────
    // El borde en focus y el label ya heredan primary (rojo).
    // Solo ajustamos el border-radius para coherencia.
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,   // --border-radius-md
        },
      },
    },

    // ── Select / MenuItem ──────────────────────────────────────────────────
    // El MenuItem seleccionado usaba action.selected (azul).
    // Ahora action.selected es rojo → se resuelve solo.
    // Solo añadimos el hover explícito para mayor control.
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 4px',
          '&:hover': {
            backgroundColor: tokens.hoverRed,
          },
          '&.Mui-selected': {
            backgroundColor: tokens.selectedRed,
            '&:hover': {
              backgroundColor: tokens.focusRed,
            },
          },
        },
      },
    },

    // ── DataGrid ───────────────────────────────────────────────────────────
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          // Cabecera
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: tokens.grey50,              // --surface-page
            borderBottom: `2px solid ${tokens.grey200}`, // --color-border
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.875rem',
          },
          // Hover de fila — usa surface-hover rojo en lugar del gris/azul por defecto
          '& .MuiDataGrid-row:hover': {
            backgroundColor: tokens.hoverRed,
          },
          // Fila seleccionada
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: tokens.selectedRed,
            '&:hover': {
              backgroundColor: tokens.focusRed,
            },
          },
          // Checkbox — ya hereda primary (rojo) automáticamente
          // Paginación — el botón activo ya hereda primary
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${tokens.grey200}`,
          },
          // Celda en foco
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: `2px solid ${tokens.red700}`,
            outlineOffset: '-2px',
          },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: `2px solid ${tokens.red700}`,
            outlineOffset: '-2px',
          },
        },
      },
    },

    // ── Autocomplete ───────────────────────────────────────────────────────
    // El highlight del ítem que coincide con la búsqueda era azul.
    MuiAutocomplete: {
      styleOverrides: {
        option: {
          borderRadius: 6,
          margin: '2px 4px',
          // El highlight de búsqueda
          '&[aria-selected="true"]': {
            backgroundColor: `${tokens.selectedRed} !important`,
          },
          '&.Mui-focused, &:hover': {
            backgroundColor: `${tokens.hoverRed} !important`,
          },
        },
        listbox: {
          padding: '4px',
        },
      },
    },

    // ── Chip ───────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },

    // ── Dialog ─────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',  // --shadow-2xl
          border: 'none',
        },
      },
    },

    // ── List / ListItem (usado en Sidebar interno de MUI si aplica) ────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: tokens.hoverRed,
          },
          '&.Mui-selected': {
            backgroundColor: tokens.selectedRed,
            '&:hover': {
              backgroundColor: tokens.focusRed,
            },
          },
        },
      },
    },

    // ── Checkbox / Radio / Switch ──────────────────────────────────────────
    // Ya heredan primary (rojo) automáticamente al cambiar la paleta.
    // No necesitan override a menos que quieras ajustar el tamaño/forma.

    // ── CircularProgress ───────────────────────────────────────────────────
    // Ya hereda primary (rojo) automáticamente.

    // ── Badge ──────────────────────────────────────────────────────────────
    // El Badge con color="error" ya usa el rojo. Si usas color="primary",
    // ahora también será rojo.

    // ── Tooltip ────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.grey900,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
        arrow: {
          color: tokens.grey900,
        },
      },
    },

    // ── Snackbar / Alert ───────────────────────────────────────────────────
    // No necesita override — usa los colores semánticos (success, error, etc.)
    // que ya están correctamente configurados en la paleta.

    // ── Divider ────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tokens.grey200,   // --color-border
        },
      },
    },
  },
});