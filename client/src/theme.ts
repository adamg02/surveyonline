import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#E91E63', // Savanta-inspired pink
      light: '#F8BBD9',
      dark: '#AD1457',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#FF4081', // Bright accent pink
      light: '#FF79B0',
      dark: '#C60055',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#666666',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 2px 8px rgba(233, 30, 99, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(233, 30, 99, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(233, 30, 99, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#E91E63',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #E91E63 30%, #FF4081 90%)',
          boxShadow: '0 2px 12px rgba(233, 30, 99, 0.3)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorSecondary: {
          backgroundColor: 'rgba(255, 64, 129, 0.1)',
          color: '#C60055',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #E91E63 30%, #FF4081 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #AD1457 30%, #C60055 90%)',
          },
        },
      },
    },
  },
});