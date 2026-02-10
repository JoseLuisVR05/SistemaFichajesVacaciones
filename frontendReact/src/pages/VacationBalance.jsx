import { useState, useEffect } from "react";
import { 
    Box, Typography, Paper, CircularProgress, Card,
    CardContent, Grid, Chip, Button, Snackbar, Alert,
    LinearProgress
} from '@mui/material';
import { 
    BeachAccess as BeachIcon,
    EventAvailable as AvailableIcon,
    EventBusy as UsedIcon,
    CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { getBalance, getTeamBalances } from '../services/vacationsService';


export default function VacationBalance(){
    const { user } = useAuth();
    const { hasRole, canViewEmployees } = useRole();
    // Saldo del usuario
    const [myBalance, setMyBalance] = useState(null);
    // Saldo del equipo si es MANAGER
    const [teamBalances, setTeamBalances] = useState(null);
    // Inidicador de carga
    const [loading, setLoading] = useState(true);
    // Feedback visual
    const [snackbar, setSnackBar] = useState
    ({
        open: false, message: '', severity: `success`
    });

    // Año actual(se puede hacer seleccionable en el futuro)
    const currentYear = new Date().getFullYear();

    useEffect(() =>{
        loadData();
    }, []);


    const loadData = async () => {
        setLoading(true);
        try{
            // Obtener saldo propio(usuario autenticado)
            const balance = await getBalance({ year: currentYear});
            setMyBalance(balance);

            // Obtener saldos del equipo
            if(canViewEmployees()) {
                const team = await getTeamBalances(currentYear);
                setTeamBalances(team);
            }
        } catch (err){
            console.error ('Error cargando saldos:', err);
            setSnackBar({
                open: true,
                message: err.response?.data?.message || 'Error cargando saldo de vacaciones',
                severity: 'error'
            });
        } finally{
            setLoading(false);
        }
    };

    // Calcula porcentaje de dias usado en la barra de progreso
    const getUsagePercentage = (used, allocated) =>{
        if(!allocated || allocated === 0) return 0;
        return Math.min(Math.round((used / allocated) * 100), 100);
    };


    if (loading) {
        return(
            <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
                <CircularProgress/>
            </Box>
        );
    }

    return (
        <Box sx={{width: '75vw'}}>
            {/*Titulo*/}
            <Typography variant="h4" textAlign="center" gutterBottom>
                Saldo de Vacaciones {currentYear}
            </Typography>

            {/*Tarjeta de resumen propio*/}
            {myBalance && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {/* Dias asignados*/}
                    <Grid item xs={12} sm={4}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100% )',
                            color: 'white'
                        }}>
                            <CardContent>
                                <Box 
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                    mb={1}
                                >
                                    <CalendarIcon />
                                    <Typography variant="subtitle2">
                                        Dias asignados
                                    </Typography>
                                </Box>
                                <Typography variant="h3" fontWeight="700">
                                    {myBalance.allocatedDays}
                                </Typography>
                                <Typography variant="caption" sx={{opacity: 0.8}}>
                                    Política: {myBalance.policyName || 'Estandar'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Días usados*/}
                    <Grid item xs={12} sm={4}>
                        <Card sx={{
                            background: 'linear-gradient(125deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white'
                        }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <UsedIcon />
                                    <Typography variant="subtitle2">
                                        Días usados
                                    </Typography>
                                </Box>
                                <Typography variant="h3" fontWeight="700">
                                    {myBalance.usedDays}
                                </Typography>
                                {/* Barra de progreso visual*/}
                                <LinearProgress
                                    variant="determinate"
                                    value={getUsagePercentage(myBalance.usedDays,myBalance.allocatedDays)}
                                    sx={{
                                        mt: 1,
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255,255,255,0.3)',
                                        '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Días disponibles*/}
                    <Grid item xs={12} sm={4}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: 'white'
                        }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <AvailableIcon />
                                    <Typography variant="subtitle2">
                                        Días disponibles
                                    </Typography>
                                </Box>
                                <Typography variant="h3" fontWeight="700">
                                    {myBalance.remainingDays}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8}}>
                                    de {myBalance.allocatedDays} asigandos
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabla de saldos del equipo(solo MANAGER)*/}
            {canViewEmployees() && teamBalances.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="600" gutterBottom>
                        Saldos del equipo
                    </Typography>
                    <Box sx={{ overflowX: 'auto'}}>
                        <table style={{ width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Empleado</th>
                                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Departamento</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px' }}>Asignados</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px' }}>Usados</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px' }}>Disponibles</th>
                                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Política</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamBalances.map((emp) => (
                                    <tr key={emp.employeeId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '10px 8px' }}>
                                            <Typography variant="body2" fontWeight="500">
                                                {emp.fullName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {emp.employeeCode}
                                            </Typography>
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>
                                            {emp.department || '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                            {emp.allocatedDays}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                            {emp.usedDays}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                            <Chip
                                                label={emp.remainingDays}
                                                color={emp.remainingDays > 5 ? 'success' : emp.remainingDays > 0 ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <Typography variant="caption">{emp.policyName}</Typography>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                </Paper>
            )}

            {/* Snackbar de feedack */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackBar({ ...snackbar, open: false})}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center'}}
            >
                <Alert severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );

}