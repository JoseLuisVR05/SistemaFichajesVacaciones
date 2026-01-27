import { useState } from 'react'; // manejar estado local en el componente
import { useNavigate } from 'react-router-dom';// para redirigir al usuario después del login
import { TextField, Button, Box, Alert } from '@mui/material';// componentes de la biblioteca MUI para construir la interfaz de usuario
import { useAuth } from '../context/AuthContext';// para acceder al contexto de autenticación

export default function Login() {
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();// Accede a la función de login del contexto de autenticación
  const navigate = useNavigate(); // Hook para redirigir al usuario

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <form onSubmit={handleSubmit}> // Ejecuta handleSubmit al enviar el formulario
        <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" />
        <TextField fullWidth label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" />
        {error && <Alert severity="error">{error}</Alert>}
        <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>Entrar</Button>
      </form>
    </Box>
  );
}