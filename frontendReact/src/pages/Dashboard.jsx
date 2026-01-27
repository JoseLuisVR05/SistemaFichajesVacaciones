import { useState } from 'react';
import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { registerEntry } from '../services/timeService';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEntry = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await registerEntry(type);
      setMessage(result.message || `Fichaje ${type} registrado con éxito`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, textAlign: 'center' }}>
      <Typography variant="h4">Bienvenido, {user?.employeeName}</Typography>
      <Typography variant ="body1" sx={{mt: 1, color: 'text.secondary'}}>
        Roles: {user?.role?.join(', ')} 
      </Typography>

      {message && <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 3 }}>{message}</Alert>}

      <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center' }}>
        <Button 
        variant="contained" 
        color="success" 
        size="large" 
        onClick={() => handleEntry('IN')} 
        disabled={loading}
        sx={{minWidth: 150}}
        >
        {loading ? <CircularProgress size={24} /> : 'ENTRADA'}
        </Button>
        <Button 
        variant="contained" 
        color="error" 
        size="large" 
        onClick={() => handleEntry('OUT')} 
        disabled={loading}
        sx={{minWidth: 150}}
        >
        {loading ? <CircularProgress size={24} /> : 'SALIDA'}
        </Button>
      </Box>
    </Box>
  );
}