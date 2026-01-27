import { useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { registerEntry } from '../services/timeService';

export default function Dashboard() {
  const [lastEntry, setLastEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEntry = async (type) => {
    setLoading(true);
    try {
      const result = await registerEntry(type);
      setLastEntry({ type, time: new Date() });
      setMessage(result.message);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h4">Sistema de Fichajes</Typography>
      {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" color="success" size="large" onClick={() => handleEntry('IN')} disabled={loading}>
          ENTRADA
        </Button>
        <Button variant="contained" color="error" size="large" onClick={() => handleEntry('OUT')} disabled={loading}>
          SALIDA
        </Button>
      </Box>
    </Box>
  );
}