import { useState, useEffect } from "react";
import { 
    Box, Typography, Paper, CircularProgress, TextField,
    Button, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, InputAdornment
    } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Search, Visibility, Business, Email } from '@mui/icons-material';
import { getEmployees, getEmployee } from "../../../services/employeesService";
import { toLocalDate } from '../../../utils/helpers/dateUtils';
import { useTranslation } from 'react-i18next';

export default function Employees(){
    const [ rows, setRows ] = useState([]);
    const [ allRows, setAllRows] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ searchText, setSearchText ] = useState('');
    const [ detailOpen, setDetailOpen ] = useState(false);
    const [ selectedEmployee, setSelectedEmployee ] = useState(null);
    const [ detailLoading, setDetailLoading ] = useState(false);
    const { t } = useTranslation();
    useEffect(() =>{
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try{
            const data = await getEmployees();
            const formated = data.map(emp => ({
                id: emp.employeeId,
                ...emp
            }));

            setAllRows(formated);
            setRows(formated);
        } catch(err){
            console.error('Error cargando empleados:', err);
        }finally{
            setLoading(false);
        }
    };

    const handleSearch = () =>{
        if(!searchText.trim()){
            setRows(allRows);
            return;
        }
    
    const lower = searchText.toLowerCase();

    const filtered = allRows.filter(emp =>
        emp.fullName?.toLowerCase().includes(lower) ||
        emp.employeeCode?.toLowerCase().includes(lower) ||
        emp.email?.toLowerCase().includes(lower) ||
        emp.department?.toLowerCase().includes(lower)
    );

    setRows(filtered);
};

const handleViewDetail = async (employeeId) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try{
        const detail = await getEmployee(employeeId);
        setSelectedEmployee(detail);
    }catch (err){
        console.error('Error cargando detalle:', err);
    }finally{
        setDetailLoading(false);
    }
};

const columns = [
    {field: 'employeeCode', headerName: t('employees.columns.code'), width: 110},
    {field: 'fullName', headerName: t('employees.columns.name'), flex: 1, minWidth: 200},
    {field: 'email', headerName: t('employees.columns.email'), width: 200},
    {field: 'department', headerName: t('employees.columns.department'), width: 150},
    {field: 'company', headerName: t('employees.columns.company'), width: 130},
    {
        field: 'isActive',
        headerName: t('employees.columns.status'),
        width: 100,
        renderCell: ({ value }) =>(
            <Chip
            label = { value?t('common.status.active'):t('common.status.inactive')}
            color = { value?'success':'default'}
            size = "small"
            />
        )
    },
    {
        field: t('common.actions'),
        headerName: t('common.actions'),
        width: 80,
        sortable: false,
        renderCell:({ row }) =>(
            <IconButton size="small" onClick={() => handleViewDetail(row.id)}>
                <Visibility fontSize="small"/>
            </IconButton>
        )
    }
];

return(

    <Box>
        <Typography variant = "h4" gutterBottom textAlign = 'center'>
            {t('employees.title')}
        </Typography>

         {/* Barra de busqueda */}
    <Paper sx ={{ p: 2, mb: 3, mt: 2}}>
        <Box sx ={{ display: 'flex', gap: 2, alignItems: 'center'}}>
            <TextField
            label = {t('employees.search')}
            placeholder = {t('employees.searchPlaceholder')}
            value = {searchText}
            onChange ={(e) => setSearchText(e.target.value)}
            onKeyDown ={(e) => e.key === 'Enter' && handleSearch()}
            size ="small"
            sx = {{ flex: 1}}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search/>
                    </InputAdornment>
                )
            }}
            />
            <Button variant = "contained" onClick = {handleSearch}>
                {t('common.search')}
            </Button>
            <Button
            variant = "outlined"
            onClick={() => {setSearchText(''); setRows(allRows);}}
            >
                {t('common.clear')}
            </Button>
        </Box>
    </Paper>

    {/* Tabla */}
    <Paper sx = {{ height: 550}}>
        {loading?(
            <Box display = "flex" justifyContent = "center" alignItems = "center" height = "100%">
                <CircularProgress/>
            </Box>
        ):(
            <DataGrid
            rows = {rows}
            columns = {columns}
            initialState = {{
                pagination: { paginationModel: {pageSize: 10}},
            }}
            pageSizeOptions = {[10,25,50]}
            disableRowSelectionOnClick
            />
        )}
    </Paper>

    {/* Dialog: dellate del empleado*/}
    <Dialog
    open = {detailOpen}
    onClose={() => {setDetailOpen(false); setSelectedEmployee(null);}}
    maxWidth = "sm"
    fullWidth
    >
        <DialogTitle>{t('employees.detail.title')}</DialogTitle>
        <DialogContent>
            {detailLoading?(
                <Box display = "flex" justifyContent = "center" py = {4}>
                    <CircularProgress/>
                </Box>
            ): selectedEmployee?(
                <Box sx ={{display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1}}>
                    <Typography>
                        <strong>{t('employees.detail.code')}:</strong>{selectedEmployee.employeeCode}
                    </Typography>
                    <Typography>
                        <strong>{t('employees.detail.name')}:</strong>{selectedEmployee.fullName}
                    </Typography>
                    <Typography>
                        <Email fontSize = "small" sx = {{verticalAlign: 'middle', mr: 0.5}}/>
                        <strong>{t('employees.detail.email')}:</strong>{selectedEmployee.email}
                    </Typography>
                    <Typography>
                        <Business fontSize = "small" sx = {{verticalAlign: 'middle', mr: 0.5}}/>
                        <strong>{t('employees.detail.company')}:</strong>{selectedEmployee.company || '-'}
                    </Typography>
                    <Typography>
                        <strong>{t('employees.detail.businessUnit')}:</strong>{selectedEmployee.businessUnit || '-'}
                    </Typography>
                    <Typography>
                        <strong>{t('employees.detail.department')}:</strong>{selectedEmployee.department || '-'}
                    </Typography>
                    <Typography>
                        <strong>{t('employees.columns.status')}:</strong>{''}
                        <Chip
                        label = {selectedEmployee.isActive?t('common.status.active') : t('common.status.inactive')}
                        color = {selectedEmployee.isActive?'success' : 'default'}
                        size = "small"
                        />
                    </Typography>
                    <Typography>
                        <strong>{t('employees.detail.startDate')}:</strong>{''}
                        {selectedEmployee.startDate
                        ? toLocalDate(selectedEmployee.startDate).toLocaleDateString('es-ES')
                        :'-'}
                    </Typography>
                     {selectedEmployee.endDate &&(
                    <Typography>
                        <strong>{t('employees.detail.endDate')}:</strong>{''}
                        {toLocalDate(selectedEmployee.endDate).toLocaleDateString('es-ES')}
                    </Typography>
                    )}
                    
                </Box>
            ) : (
                <Typography>{t('employees.detail.noDetails')}</Typography>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick = {() => { setDetailOpen(false); setSelectedEmployee(null); }}>
                {t('common.close')}
            </Button>
        </DialogActions>
    </Dialog>
    </Box>
    );
}
