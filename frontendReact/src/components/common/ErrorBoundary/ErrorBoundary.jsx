import { Component } from 'react';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

/**
 * Error Boundary - Captura errores en cualquier componente hijo
 * y evita que la aplicación completa se bloquee.
 * 
 * Uso:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log del error para debugging
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de logging remoto
    // E.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Reload para resetear el estado completamente
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              gap: 3,
              textAlign: 'center',
            }}
          >
            <ErrorOutline sx={{ fontSize: 80, color: 'error.main' }} />
            
            <Typography variant="h4" fontWeight="bold">
              Oops! Algo salió mal
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
            </Typography>

            <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Error:</strong> {this.state.error?.toString()}
              </Typography>
              {process.env.NODE_ENV === 'development' && (
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    overflow: 'auto',
                    maxHeight: 200,
                    backgroundColor: '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {this.state.errorInfo?.componentStack}
                </Typography>
              )}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
                onClick={this.handleReset}
                size="large"
              >
                Recargar Aplicación
              </Button>
              <Button
                variant="outlined"
                href="/"
                size="large"
              >
                Ir a Inicio
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
