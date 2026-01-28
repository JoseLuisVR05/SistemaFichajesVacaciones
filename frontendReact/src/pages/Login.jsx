import { useState } from 'react'; // manejar estado local en el componente
import { useNavigate } from 'react-router-dom';// para redirigir al usuario después del login
import { TextField, Button, Box, Alert, Typography } from '@mui/material';// componentes de la biblioteca MUI para construir la interfaz de usuario
import { useAuth } from '../context/AuthContext';// para acceder al contexto de autenticación

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();// Accede a la función de login del contexto de autenticación
  const navigate = useNavigate(); // Hook para redirigir al usuario

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard'); // Redirige al usuario al dashboard después del login exitoso
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <Box
  component="main"
  sx={{
    position: 'fixed',  // Esto asegura que ocupe toda la pantalla
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    bgcolor: 'rgba(211, 47, 47, 0.8)',
    backgroundImage: 'linear-gradient(135deg, rgba(183, 28, 28, 0.8), rgba(211, 47, 47, 0.8))',
    p: 3,
    overflow: 'auto' // Para scroll si es necesario
  }}
>
  <Box
    sx={{
      maxWidth: 400,
      width: '100%',
      bgcolor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 2,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      overflow: 'hidden'
    }}
  >
        <Box
          sx={{
            py: 3,
            px: 2,
            textAlign: 'center',
          }}
        >
        <Typography 
          variant="h5" 
          component="h1"
          sx={{ 
            color: 'black',
            fontWeight: '600',
            letterSpacing: 0.5
          }}
        >
        Iniciar Sesión
        </Typography>
      </Box>

      <Box sx={{p: 4,}}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body1"
              component="label"
              htmlFor="Email"
              sx={{ 
                display: 'block',
                mb: 1,
                color: '#333',
                fontWeight: '500',
              }}
            >
              Email
            </Typography> 
            <TextField
              id = "Email"
              fullWidth
              variant='outlined'
              size = "medium"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              sx ={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }
               }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body1"
              component="label"
              htmlFor="password" 
              sx ={{
                display: 'block',
                mb: 1,
                color: '#333',
                fontWeight: '500',
              }}
            >
              Contraseña
          </Typography> 
          <TextField
            id='password'
            fullWidth
            variant='outlined'
            type="password"
            size = "medium"
            value={password} onChange={(e) => setPassword(e.target.value)} 
            margin="normal"
            sx ={{ '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }
               }}
          />
          </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Button 
        fullWidth 
        variant="contained" 
        type="submit" 
        sx={{ 
          mt: 1,
          backgroundColor: '#d32f2f',
          '&:hover': {
            backgroundColor: '#b71c1c'
          },
          py: 1.5,
          fontWeight: 'bold'
        }}
        >
        Entrar
        </Button>
      </form>
    </Box>
    </Box>
    </Box>
  );
}