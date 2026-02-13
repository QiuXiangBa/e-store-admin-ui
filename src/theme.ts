import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f766e'
    },
    secondary: {
      main: '#0369a1'
    },
    background: {
      default: '#f3f7f6',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Noto Sans SC", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 700
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained'
      }
    }
  }
});
