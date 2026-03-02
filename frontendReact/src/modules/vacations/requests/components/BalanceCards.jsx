// src/modules/vacations/requests/components/BalanceCards.jsx
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  AccountBalanceWallet,
  EventBusy,
  EventAvailable,
} from '@mui/icons-material';
import { Grid } from '@mui/material';
import { t } from 'i18next';

/**
 * BalanceCards
 * Muestra las 3 tarjetas de saldo de vacaciones:
 * Asignados | Usados | Restantes
 *
 * @param {object} balance - Objeto con allocatedDays, usedDays, remainingDays
 */
export function BalanceCards({ balance }) {
  // Si no hay balance configurado, no renderizamos nada
  if (!balance) return null;


  const cards = [
    {
      label: t('vacations.balance.allocated'),
      value: balance.allocatedDays,
      icon: <AccountBalanceWallet color="success" />,
      bg: '#f5f5f5',
    },
    {
      label: t('vacations.balance.used'),
      value: balance.usedDays,
      icon: <EventBusy color="error" />,
      bg: '#fff3f0',
    },
    {
      label: t('vacations.balance.remaining'),
      value: balance.remainingDays,
      icon: <EventAvailable color="success" />,
      bg: '#f0faf0',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cards.map(({ label, value, icon, bg }) => (
        <Grid item xs={12} sm={4} size={4} key={label}>
          <Card sx={{ bgcolor: bg }}>
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.5,
                '&:last-child': { pb: 1.5 },
              }}
            >
              {icon}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight="700">
                  {value} {t('vacations.table.days')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}