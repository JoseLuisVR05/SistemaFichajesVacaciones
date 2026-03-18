# 📊 ANÁLISIS PROFUNDO DEL CODEBASE - SistemaFichajes

**Fecha:** Marzo 18, 2026  
**Proyectos analizados:** Frontend React + Backend .NET 8 + SQL Server  
**Escala:** ~2,500+ líneas de código frontend, ~3,000+ backend  

---

## 1️⃣ ESTRUCTURA Y ORGANIZACIÓN

### ✅ LO BIEN HECHO

#### Frontend - Separación clara de responsabilidades
```
frontendReact/src/
├── pages/          → Solo rutas principales (Login.jsx)
├── modules/        → Features aisladas (dashboard, time, vacations, employees, admin)
├── components/     → Componentes reutilizables (UI, ProtectedRoute)
├── hooks/          → Lógica personalizada (useFetch, useCorrections, useDashboard)
├── services/       → Cliente HTTP (api.js + específicos por feature)
├── context/        → Auth global (AuthContext)
├── utils/          → Helpers puros (dateUtils, validations)
└── styles/         → Tema centralizado (theme.js)
```

**Fortalezas:**
- Módulos agnósticos: `time/`, `vacations/`, `employees/` pueden escalarse independientemente
- Componentes "presentacionales" vs "contenedores" bien diferenciados
- Hooks reutilizables reducen duplicación de lógica (useFetch, useCorrections, useVacations)
- Theme centralizado en MUI (colores, tipografía, componentes personalizados)

#### Backend - Arquitectura en capas clara
```
SistemaFichajes/
├── Domain/         → Entidades + lógica pura
├── Application/    → DTOs + Interfaces de servicios
├── Infrastructure/ → DbContext + Implementaciones de servicios
└── Api/            → Controllers + Atributos
```

**Fortalezas:**
- DbContext bien configurado con fluent mappings
- Controllers delegan lógica a servicios (TimeSummaryService, VacationRequestService)
- DTOs separados de entidades
- Atributo personalizado RequireRole para autorización

---

### ⚠️ PROBLEMAS IDENTIFICADOS

#### 1. **CÓDIGO MUERTO - adminService.js (SEVERIDAD: ALTA)**

📍 **Ubicación:** `frontendReact/src/services/adminService.js` (ELIMINADO pero registrado en memory)

**Problema:**
- 8 funciones exportadas pero **nunca importadas** en ningún componente:
  - `getWorkSchedules()`, `createWorkSchedule()`, `updateWorkSchedule()`, `deleteWorkSchedule()`
  - `toggleEmployeeStatus()` ← Duplicado de employeesService
  - `importEmployeesCsv()` ← Duplicado de employeesService
  - `getImportHistory()` ← Duplicado de employeesService
  - `getImportErrors()` ← Nunca usado

**Por qué es problema:**
- Confunde a nuevos desarrolladores (¿debería usarse?)
- Mantenimiento duplicado (cambios en un lugar pero no en otro)
- Inconsistencia: algunos usan `schedulesService`, otros mirarían `adminService`

**Impacto (escala 1-10):** **7/10** - Confusión + mantenimiento innecesario

**Solución recomendada:**
```javascript
// ✅ USAR (estos YA se usan y funcionan):
// - employeesService.importEmployeesCSV() - USADO en ImportTab.jsx
// - employeesService.getImportRuns()      - USADO en ImportTab.jsx
// - schedulesService.*                    - USADO en SchedulesTab.jsx

// ❌ ELIMINAR adminService.js completamente
// Si en futuro se necesita centralizar, crear:
// adminService.js SOLO re-exportando desde otros servicios
```

---

#### 2. **FUNCIONES DE SERVICIO HUÉRFANAS - vacationsService.js (SEVERIDAD: MEDIA)**

📍 **Ubicación:** `frontendReact/src/services/vacationsService.js`

**Funciones sin usar:**
```javascript
getTeamBalances()        // Línea 49 - No se importa en ningún componente
bulkAssignBalances()     // Línea 56 - No se importa
recalculateBalance()     // Línea 60 - No se importa
getPolicy()              // Línea 9  - No se importa (pero existe en backend)
```

**Por qué no es crítico:**
- Podrían ser intención futura para Admin Panel
- Servicios backend existen y funcionan
- APIs estarían disponibles pero sin UI

**Impacto:** **5/10** - Intención futura clara

**Acción:**
```javascript
// ✅ DOCUMENTAR en vacationsService.js:
/* 
 * SERVICIOS DISPONIBLES VÍA API PERO SIN UI/NECESIDAD ACTUAL:
 * - getTeamBalances()    → Para futuro dashboard RRHH
 * - bulkAssignBalances() → Para futuro operación en lote
 * - recalculateBalance() → Para futuro recálculo de saldo
 */
```

---

#### 3. **DUPLICACIÓN DE LÓGICA DE VALIDACIÓN FECHAS (SEVERIDAD: MEDIA)**

📍 **Ubicación múltiple:**

**Frontend:** `frontendReact/src/modules/vacations/requests/components/RequestForm.jsx` línea 16
```javascript
const isWekend = (dateStr) => {  // ⚠️ Typo: "Wekend" en lugar de "Weekend"
  if (!dateStr) return false;
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}
```

**Backend:** `SistemaFichajesVacaciones.Application/Services/VacationRequestService.cs` línea ~95
```csharp
if (date.DayOfWeek != DayOfWeek.Saturday && 
    date.DayOfWeek != DayOfWeek.Sunday)
{
    workingDays += 1.0m;
}
```

**Problema:**
- Validación de fin de semana repetida en 2 idiomas (JS + C#)
- Si cambian las reglas de negocio, hay que actualizar 2 sitios
- Frontend hace validación DIFERENTE al backend (frontend solo detecta, backend calcula)

**Impacto:** **6/10** - Inconsistencia potencial

**Solución:**
```javascript
// ✅ Frontend: centralizar helpers
// frontendReact/src/utils/helpers/businessRules.js
export const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
};

export const calculateWorkingDays = (startDate, endDate) => {
  // SOLO ESTIMACIÓN LOCAL - backend es la fuente de verdad
  let count = 0;
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    if (!isWeekendDate(d.toISOString().split('T')[0])) count++;
  }
  return count;
};
```

---

#### 4. **INCONSISTENCIA EN NOMBRES - TimeEntry.Time vs EventTime (SEVERIDAD: MEDIA)**

📍 **Ubicación:** `SistemaFichajesVacaciones.Domain/Entities/TimeEntry.cs`

```csharp
public class TimeEntry
{
    public int TimeEntryId { get; set; }
    public int EmployeeId { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public DateTime EventTime { get; set; }      // ⚠️ Se usa para crear
    public string Source { get; set; } = string.Empty;
    public string? GeoLocation { get; set; }
    public string? DeviceId { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime? Time { get; set; }           // ⚠️ Se usa para búsquedas/cálculos
}
```

**Problema:**
- `EventTime`: Cuándo ocurrió
- `Time`: Cuándo se registró (aparentemente igual que EventTime)
- Controllers usan `Time`, entidad almacena `EventTime`

Búsqueda en TimeEntriesController:
```csharp
var entries = await _db.TimeEntries
    .Where(e => e.EmployeeId == employeeId
            && e.Time != null
            && e.Time >= dateOnly
            && e.Time < nextDay)
    .OrderBy(e => e.Time)
    .ToListAsync();
```

Pero se asigna así:
```csharp
var entry = new TimeEntry {
    EventTime = now,   // ← Se asigna EventTime
    Time = now,        // ← Se asigna Time también
    CreatedByUserId = userId
};
```

**Impacto:** **7/10** - Confusión semántica

**Solución:**
```csharp
// ✅ Opción 1: Consolidar (recomendado)
public class TimeEntry
{
    public DateTime TakenAt { get; set; }      // Cuándo ocurrió el fichaje
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow; // Cuándo se registró
}

// ✅ Opción 2: Documentar claramente
/// <summary>
/// Fecha/hora en que ocurrió el fichaje (IN/OUT).
/// Se usa para búsquedas y cálculos de resumen.
/// </summary>
public DateTime? Time { get; set; }

/// <summary>
/// Timestamp de creación del registro. 
/// Se usa para auditoría y trazabilidad.
/// </summary>
public DateTime EventTime { get; set; }
```

---

#### 5. **ORGANIZACIÓN DE CONTROLADORES - Sin segregación por responsabilidad (SEVERIDAD: BAJA)**

📍 **Ubicación:** `SistemaFichajesVacaciones.Api/Controllers/`

**Estructura actual:** 11 controllers monolíticos
```
Controllers/
├── EmployeesController.cs           (28 methods - demasiado!)
├── TimeEntriesController.cs         (consultas + registro)
├── TimeCorrectionsController.cs     (CRUD + aprobaciones)
├── VacationRequestsController.cs    (CRUD + aprobaciones + validación)
├── VacationBalanceController.cs
├── VacationPoliciesController.cs
├── WorkSchedulesController.cs
├── AbsenceCalendarController.cs
├── TimeExportController.cs
├── AuthController.cs
└── ImportRunsController.cs
```

**Problema:**
- EmployeesController hace además de CRUD: importación, cierre de CSV, toggle active
- Responsabilidades mixtas = difícil de testear

**Impacto:** **4/10** - Baja prioridad

---

---

## 2️⃣ ESCALABILIDAD

### 📈 ANÁLISIS PARA 100+ EMPLEADOS SIMULTÁNEOS

#### Backend - Puntos de cuello de botella

**1. TimeSummaryService - CRÍTICO (Impacto: 8/10)**

📍 Ubicación: `SistemaFichajesVacaciones.Infrastructure/Services/TimeSummaryService.cs`

```csharp
public async Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(int employeeId, DateTime fromDate, DateTime toDate)
{
    var summaries = new List<TimeDailySummary>();
    
    // ⚠️ PROBLEMA: Bucle secuencial (1 día = 1 query)
    for (var date = fromDate.Date; date <= toDate.Date; date = date.AddDays(1))
    {
        var summary = await CalculateDailySummaryAsync(employeeId, date);  // ← Query por día
        if(summary != null)
        {
            summaries.Add(summary);
        }
    }
    return summaries;
}
```

**Con 100 empleados consultando 30 días:**
- Operación: 100 * 30 = 3,000 queries de TimeEntry
- Cada query incluye `Include(e => e.Employee)`, `Include()` en Calendar_Days
- **Resultado:** ~3,000 queries * 100ms = **300 segundos** (inacceptable)

**Impacto:** **8/10** - Sistema se ralentiza exponencialmente

**Solución:**
```csharp
// ✅ Cargar TODA la data de una vez (batch)
public async Task<List<TimeDailySummary>> CalculateRangeSummaryAsync(
    int employeeId, DateTime fromDate, DateTime toDate)
{
    // 1. Una sola query para TODOS los días (batch)
    var entries = await _db.TimeEntries
        .Where(e => e.EmployeeId == employeeId
                && e.Time >= fromDate.Date
                && e.Time < toDate.Date.AddDays(1))
        .ToListAsync();  // ← 1 query en lugar de 30

    // 2. Una sola query para calendario
    var calendarDays = await _db.Calendar_Days
        .Where(c => c.Date >= fromDate.Date && c.Date <= toDate.Date)
        .ToListAsync();  // ← 1 query en lugar de 30

    var calendarDict = calendarDays.ToDictionary(c => c.Date);
    var entriesByDate = entries.GroupBy(e => e.Time!.Value.Date)
        .ToDictionary(g => g.Key, g => g.ToList());

    // 3. Procesar en memoria (MUCHO más rápido)
    var summaries = new List<TimeDailySummary>();
    for (var date = fromDate.Date; date <= toDate.Date; date = date.AddDays(1))
    {
        var dailyEntries = entriesByDate.GetValueOrDefault(date) ?? new List<TimeEntry>();
        var summary = CalculateDailySummaryInMemory(employee, date, dailyEntries, calendarDict);
        sommaries.Add(summary);
    }
    return summaries;

    // ✅ Resultado: 2 queries + procesamiento en memoria
    // Con 100 empleados: 100 * 2 = 200 queries (vs 3,000 antes)
    // **Mejora: 15x más rápido**
}
```

---

**2. Absence Calendar - Consultas ineficientes (Impacto: 7/10)**

📍 Ubicación: `SistemaFichajesVacaciones.Infrastructure/AppDbContext.cs`

Cada consulta de resumen hace:
```csharp
var calendarDay = await _db.Calendar_Days
    .AsNoTracking()
    .SingleOrDefaultAsync(c => c.Date == dateOnly);
```

Con 1 día = 1 query, y 100 empleados = 100 queries al mismo tiempo.

**Solución: Caché en memoria**
```csharp
// ✅ Caché de Calendar
public class CalendarCacheService
{
    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;
    
    public async Task<Dictionary<DateTime, Calendar_Days>> GetMonthAsync(int year, int month)
    {
        var key = $"calendar_{year}_{month}";
        if (_cache.TryGetValue(key, out Dictionary<DateTime, Calendar_Days> cached))
            return cached;

        var days = await _db.Calendar_Days
            .Where(c => c.Date.Year == year && c.Date.Month == month)
            .ToListAsync();

        var dict = days.ToDictionary(d => d.Date);
        _cache.Set(key, dict, TimeSpan.FromHours(1)); // Caché 1 hora
        return dict;
    }
}
```

---

**3. N+1 Queries en Controllers (Impacto: 6/10)**

📍 Ejemplo: `VacationRequestsController.GetRequests()`

```csharp
var requests = await query
    .OrderByDescending(r => r.CreatedAt)
    .Select(r => new {
        r.RequestId,
        r.EmployeeId,
        // ⚠️ Aquí implícitamente carga r.Employee si se usa
    })
    .ToListAsync();
```

Si el frontend después accede `request.employeeName`, desencadena N queries adicionales.

**Solución:**
```csharp
// ✅ Eager loading explícito
var requests = await query
    .Include(r => r.Employee)  // ← Eager load
    .OrderByDescending(r => r.CreatedAt)
    .Select(r => new VacationRequestResponseDto {
        RequestId = r.RequestId,
        EmployeeId = r.EmployeeId,
        EmployeeName = r.Employee.FullName,  // ← Ya cargado, sin query adicional
    })
    .ToListAsync();
```

---

#### Frontend - Paginación y virtualización

**Problema actual:** DataGrid carga TODOS los datos

```jsx
<DataGrid
    rows={rows}  // ← rows puede tener 1,000+ elementos
    columns={columns}
    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
    pageSizeOptions={[10, 25, 50]}
/>
```

**Solución:**
```jsx
// ✅ Ya está implementado Correctamente:
// - DataGrid tiene paginación server-side habilitada
// - Pero NO hay virtualization en componentes personalizados

// ⚠️ PROBLEMA: Tablas personalizadas sin scroll virtual
// Ejemplo: Si RequestsTable carga 500 filas, renderiza 500 DIVs = lento

// ✅ Solución: Usar react-window
import { FixedSizeList } from 'react-window';

const VirtualizedTable = ({ items }) => (
    <FixedSizeList
        height={600}
        itemCount={items.length}
        itemSize={50}
        width="100%"
    >
        {({ index, style }) => (
            <div style={style}>
                {/* Renderizar solo item visible */}
                {items[index].name}
            </div>
        )}
    </FixedSizeList>
);
```

---

#### Análisis de las 3 Iniciativas

**Initiative 1 (Horarios flexibles por día):**
```
Impacto en escalabilidad: NEUTRAL (sin cambios de rendimiento)
- Cambio de 1 WorkSchedule → 7 WorkScheduleDayDetail
- +7 registros por empleado en tabla, pero búsquedas igual eficientes
- Query: SELECT * FROM WorkScheduleDayDetail WHERE EmployeeId = @id AND DayOfWeek = 3
- Índice necesario: (EmployeeId, DayOfWeek)
```

**Initiative 2 (Calendarios por país):**
```
Impacto en escalabilidad: CRÍTICO
- Calendar_Days muta: Date → (CalendarTemplateId, Date)
- Antes: 365 días/año × 1 país = 365 registros
- Después: 365 días × 5 países × 2 regiones = 3,650 registros
- Multiplicador de datos: 10x
- Búsquedas DEBEN ser: (CalendarTemplateId, Date), no solo Date
- Caché se vuelve esencial
```

**Initiative 3 (Reportes mensuales):**
```
Impacto en escalabilidad: POSITIVO
- Congelar snapshot del mes previene recálculos constantemente
- En lugar de: refetch timeSummary cada vez → fetch desde MonthlyReport (columna)
- Mejora rendimiento 5-10x para consultas históricas
- PERO: genera tabla grande (100 empleados × 12 meses × 10 años = 12,000 registros)
```

---

---

## 3️⃣ MANTENIBILIDAD Y LEGIBILIDAD

### ✅ LO BIEN HECHO

**Nombres descriptivos + Comentarios contextales**

📍 `VacationRequestService.cs`:
```csharp
/// <summary>
/// Valida una solicitud de vacaciones contra reglas de negocio.
/// VALIDACIONES EN ORDEN:
/// 1. Fechas coherentes (fin >= inicio)
/// 2. No solicitar en el pasado
/// 3. Calcular días laborables
/// 4. Verificar saldo disponible
/// 5. Detectar solapamientos
/// 6. Advertencias informativas
/// </summary>
```

✅ Excelente: Documentación clara de qué hace y POR QUÉ

---

**Funciones no excesivamente largas**

Mayoría de funciones: 20-50 líneas (bueno)

Excepciones:
- `TimeSummaryService.CalculateDailySummaryAsync()` → 120 líneas (un poco)
- `VacationRequestService.ValidateRequestAsync()` → 150+ líneas (se podría dividir)

---

### ⚠️ PROBLEMAS

**1. Falta de JSDoc/comentarios en Frontend (Impacto: 5/10)**

📍 `frontendReact/src/hooks/useHistory.js`:
```javascript
export function useHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  // ... más de 100 líneas sin JSDoc inicial
}
```

**Problema:**
- ¿Qué retorna? ¿Qué params necesita?
- Nuevo desarrollador debe leer todo el código

**Solución:**
```javascript
/**
 * Hook para data histórica de fichajes.
 * 
 * @returns {Object}
 *   - rows: Array<{employeeId, employeeName, type, date, minutes}>
 *   - loading: boolean
 *   - fromDate/toDate: string (yyyy-MM-dd)
 *   - typeFilter: string (IN|OUT|ALL)
 *   - exportData(): Promise<void> - descarga CSV
 */
export function useHistory() { ... }
```

---

**2. Typo en nombre de función (Impacto: 3/10)**

📍 `frontendReact/src/modules/vacations/requests/components/RequestForm.jsx` línea 16:
```javascript
const isWekend = (dateStr) => {  // ⚠️ "Wekend" vs "Weekend"
```

**Impacto:** Confusión al buscar `isWeekend` no lo encuentra

---

**3. Inconsistencia en manejo de errores (Impacto: 6/10)**

**Backend:**
```csharp
// Algunos controllers: try-catch global
try {
    _db.SaveChangesAsync();
} catch (Exception ex) {
    return StatusCode(500, new { message = "Error", detail = ex.Message });
}

// Otros: sin try-catch (relian en middleware global)
var employee = await _context.Employees.FindAsync(id);
```

**Frontend:**
```javascript
// Algunos hooks: throw y dejan que componente lo maneje
const approve = useCallback(async (id) => {
    await approveCorrection(id);  // Si falla, no hace catch
    refetch();
}, [refetch]);

// Otros: try-catch inline
const handleSubmit = async (requestId) => {
    try {
        await submit(requestId);
        showSnack('Success');
    } catch (err) {
        showSnack(err.response?.data?.message || 'Error', 'error');
    }
};
```

**Problema:** Inconsistencia = algunos errores no se manejan, otros sí

**Solución:**
```javascript
// ✅ Crear error boundary global
const mapApiError = (error) => {
    if (error.response?.status === 401) return 'Sesión expirada';
    if (error.response?.status === 403) return 'Sin permisos';
    if (error.response?.status === 400) return error.response.data?.message || 'Datos inválidos';
    if (error.response?.status === 500) return 'Error del servidor';
    return 'Error de conexión';
};

export const useAsyncAction = (action) => {
    return useCallback(async (...args) => {
        try {
            return await action(...args);
        } catch (error) {
            const message = mapApiError(error);
            console.error('Action failed:', error);
            throw { message, original: error };
        }
    }, [action]);
};
```

---

**4. Convenciones inconsistentes en archivos (Impacto: 4/10)**

**Diferencias:**
- Algunos archivos: PascalCase (RequestForm.jsx)
- Otros: camelCase (dateUtils.js)
- Indexers: algunos exports `export const`, otros `export default`
- Algunos modules tienen `index.js` que reexporta, otros no

---

---

## 4️⃣ PATRONES Y BUENAS PRÁCTICAS

### ✅ LO BIEN HECHO

**1. Hook personalizado genérico (useFetch)**

```javascript
export function useFetch(fetchFn, deps = []) {
  // ✅ Maneja montaje/desmontaje correctamente
  const mountedRef = useRef(true);
  
  useEffect(() => {
    return () => { mountedRef.current = false; }; // Cleanup
  }, []);
  
  // ✅ Evita actualizaciones de estado en componentes desmontados
  if (mountedRef.current) setData(result);
}
```

Excelente patrón. Se reutiliza en 5+ hooks.

---

**2. Context API con hook personalizado (AuthContext)**

```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

✅ Clean. Evita prop drilling. Se usa en toda la app.

---

**3. Servicios segregados por feature**

```
services/
├── api.js                  ← Cliente base (axios + interceptors)
├── authService.js          ← Auth específico
├── employeesService.js     ← Empleados
├── timeService.js          ← Tiempo
├── correctionsService.js   ← Correcciones
└── vacationsService.js     ← Vacaciones
```

✅ Fácil de encontrar, fácil de testear.

---

**4. Backend: Separación Domain/Application/Infrastructure**

```csharp
// Domain: Entidades puras, sin dependencias
public class Employee { public int EmployeeId { get; set; } }

// Application: Interfaces + DTOs
public interface IVacationRequestService { ... }
public class CreateVacationRequestDto { ... }

// Infrastructure: Implementación
public class VacationRequestService : IVacationRequestService { ... }

// Api: Controllers inyectan interfaces
public VacationRequestsController(IVacationRequestService service) { ... }
```

✅ Testeable, mantenible, escalable.

---

### ⚠️ PROBLEMAS

**1. Estado distribuido en múltiples hooks (Impacto: 6/10)**

📍 `frontendReact/src/modules/vacations/approvals/VacationApprovals.jsx`:

```javascript
export default function VacationApprovals() {
  // Hook 1: Hook personalizado
  const { rows, loading, statusFilter, setStatusFilter, ... } = useVacationApprovals();
  
  // Hook 2: useState manual
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  
  // Hook 3: useTranslation
  const { t } = useTranslation();
  
  // resultado: gestión de estado compleja
  // cambiar un filtro -> cambiar 3 sitios diferentes
}
```

**Problema:**
- Estado repartido en 3 niveles
- Difícil de testear (no hay forma de mocksear todos los hooks)
- Refactorizar es frágil

**Solución:**
```javascript
// ✅ Centralizar en un reducer o composable
const INITIAL_STATE = {
  dialogs: { detail: false, reject: false },
  selectedRow: null,
  rejectComment: '',
  filters: { status: 'SUBMITTED', ... }
};

const reducer = (state, action) => {
  switch(action.type) {
    case 'OPEN_DETAIL': return { ...state, dialogs: { ...state.dialogs, detail: true } };
    case 'SET_SELECTED': return { ...state, selectedRow: action.payload };
    // ...
  }
};

export function useVacationApprovalsUI() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return { state, dispatch };
}
```

---

**2. Falta de Memoización innecesaria (Impacto: 4/10)**

Componentes que se renderizan innecesariamente:

```jsx
export function RequestsTable({
  rows,       ← Nuevo array cada renderizado del padre
  loading,
  statusFilter,
  onStatusFilterChange,
  onSearch,
  onView,
  onSubmit,
  onCancel,
}) {
  // Si parent reenderiza, todo se recomputa
  const columns = [...];  // Nueva array cada vez
  return <DataGrid rows={rows} columns={columns} />;
}
```

**Solución:**
```jsx
export const RequestsTable = React.memo(({
  rows, loading, statusFilter, // ...
}) => {
  const columns = useMemo(() => [...], [t]); // Memorizar columnas
  return <DataGrid rows={rows} columns={columns} />;
});
```

---

**3. Validaciones duplicadas Frontend/Backend (Impacto: 5/10)**

Frontend valida:
```javascript
if (form.startDate > form.endDate) setError('...');
if (!validation.isValid) { disabled button }
```

Backend valida (otra vez):
```csharp
if (endDate < startDate) result.Errors.Add("...");
```

**Problema:**
- Código duplicado
- Reglas diferentes = bugs

**Solución:**
```javascript
// ✅ Frontend usa backend para validación en tiempo real
useEffect(() => {
  const validate = async () => {
    const validation = await validateVacationDates(startDate, endDate);
    setValidation(validation);
  };
  validate();
}, [startDate, endDate]);

// Renderizar errores del backend directamente
{validation?.errors?.map(err => <Alert severity="error">{err}</Alert>)}
```

Ya está parcialmente implementado. ✅

---

---

## 5️⃣ TESTING Y QA

### ❌ ESTADO CRÍTICO: NO HAY TESTS

📍 Búsqueda en proyecto:
```
__tests__/    ← No existe
*.test.js     ← No existe
*.spec.js     ← No existe
*.test.cs     ← No existe
```

**Impacto:** **9/10** - Crítico

**Problemas específicos sin tests:**

1. **TimeSummaryService**: Lógica compleja de cálculos
   - ¿Qué pasa si entrada es null?
   - ¿Qué pasa si hay horarios sin schedule?
   - ¿Qué pasa si hay errores de secuencia?

2. **VacationRequestService**: Validaciones complejas
   - Solapamientos ¿funcionan correctamente?
   - Cálculo de días laborables ¿incluye festivos?
   - Relaciones múltiples ¿sin query errors?

3. **useState/useEffect**: Bugs comunes sin tests
   - Memory leaks en cleanup
   - Race conditions en fetch
   - Rendered more hooks than before error

### ✅ PLAN DE TESTING

**Fase 1 (Crítico):**
```
Backend tests (xUnit):
- TimeSummaryService        ← 20 casos
- VacationRequestService    ← 15 casos
- EmployeeImportService     ← 10 casos
Total: 45 tests (~3 horas)

Frontend tests (Vitest + React Testing Library):
- useCorrections hook       ← 8 casos
- useVacationRequests hook  ← 8 casos
- RequestForm component     ← 10 casos
Total: 26 tests (~2 horas)
```

**Ejemplo test backend:**
```csharp
[Fact]
public async Task CalculateDailySummary_WithNoEntries_ReturnsNegativeBalance()
{
    // Arrange
    var employeeId = 1;
    var date = new DateTime(2026, 3, 15); // Lunes (no festivo)
    
    // Act
    var result = await _service.CalculateDailySummaryAsync(employeeId, date);
    
    // Assert
    Assert.NotNull(result);
    Assert.Equal(0, result.WorkedMinutes);
    Assert.Equal(-480, result.BalanceMinutes); // -8h esperadas
    Assert.Equal("NO_ENTRIES", result.IncidentType);
}
```

**Ejemplo test frontend:**
```javascript
describe('useCorrections', () => {
  it('should retry refetch on action success', async () => {
    const { result } = renderHook(() => useCorrections());
    
    // Simular aprobación
    await act(async () => {
      await result.current.approve(1);
    });
    
    // Verificar que refetch se ejecutó
    expect(mockFetch).toHaveBeenCalledTimes(2); // 1 inicial + 1 refetch
  });
});
```

---

---

## 6️⃣ DOCUMENTACIÓN

### ⚠️ ESTADO: INCOMPLETO

**Qué existe:**
- `ARQUITECTURA_DECISIONES.md` ✅ Excelente (arquitectura de 3 iniciativas)
- `ModeloDeDatos.sql` ✅ Schema actual
- Algunos JSDoc en servicios backend ✅

**Qué falta:**
- README.md del frontend ( Missing)
- README.md del backend (Missing)
- Guía de desarrollo (deployment, setup local)
- Guía de API (OpenAPI/Swagger NO documentada en Controllers)
- Decisiones arquitectónicas menores
- Flujos de datos documentados
- Patrones comunes explicados

### ✅ PLAN DE DOCUMENTACIÓN

```
/docs/
├── README.md                    ← Setup + Quick Start
├── ARCHITECTURE.md              ← Ya existe
├── API.md                       ← Endpoints documentados
├── DEVELOPMENT.md               ← Patrones + cómo extender
├── DEPLOYMENT.md                ← CI/CD + Production
├── TESTING.md                   ← Cómo escribir tests
├── TROUBLESHOOTING.md           ← Errores comunes
└── /diagrams/
    ├── database-er.drawio
    ├── component-hierarchy.drawio
    └── data-flow.drawio
```

---

---

## 7️⃣ FRONTEND REACT ESPECÍFICO

### ✅ LO BIEN HECHO

**1. Validación en tiempo real (vacaciones)**

```jsx
useEffect(() => {
  if (!form.startDate || !form.endDate) return;
  const timer = setTimeout(async () => {
    setValidation(await validateVacationDates(form.startDate, form.endDate));
  }, 500); // Debounce
  return () => clearTimeout(timer);
}, [form.startDate, form.endDate]);
```

✅ Excelente UX: usuario ve errores antes de enviar

---

**2. Separación composantes presentacional/contenedor**

```jsx
// Contenedor (lógica):
export default function Corrections() { ... }

// Presentación (puro):
export function CorrectionTable({ rows, loading, onView, ... }) { ... }
export function CorrectionFilters({ ... }) { ... }
```

✅ Componentes reutilizables y testeables

---

### ⚠️ PROBLEMAS

**1. Ausencia de error boundary (Impacto: 7/10)**

Si un componente crashea:
```javascript
export default function VacationApprovals() {
  // Si aquí hay error, toda la app se cae
  const { rows } = useVacationApprovals();  // ← Error no atrapado
  return <ApprovalsTable rows={rows} />;
}
```

**Solución:**
```jsx
// ✅ Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, _) {
    console.error('Caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return <Alert severity="error">Error en la página. Recarga.</Alert>;
    }
    return this.props.children;
  }
}

// Uso:
<ErrorBoundary>
  <VacationApprovals />
</ErrorBoundary>
```

---

**2. MUI DataGrid sin lazy-loading backend (Impacto: 6/10)**

```jsx
<DataGrid
    rows={rows}  // ← Todos los datos en memoria
    pageSizeOptions={[10, 25, 50]}
/>
```

Si hay 10,000+ registros, se carga todo a memoria del cliente = lento.

**Solución:**
```jsx
const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });

const { data, isLoading } = useFetch(
    () => getCorrections({ 
        skip: paginationModel.page * paginationModel.pageSize,
        take: paginationModel.pageSize
    }),
    [paginationModel]
);

<DataGrid
    rows={data}
    paginationModel={paginationModel}
    onPaginationModelChange={setPaginationModel}
    rowCount={totalCount}
    paginationMode="server"
/>
```

---

**3. Falta de optimistic updates (Impacto: 5/10)**

Actual flujo:
```javascript
const handleApprove = async (id) => {
  setLoading(true);
  await approve(id);  // ← Espera al servidor
  showSnack('Aprobado');
};
```

**Problema:** UI se siente lenta (1-2 segundos de espera visible)

**Solución:**
```javascript
// ✅ Optimistic update
const handleApprove = async (id) => {
  // 1. Actualizar UI inmediatamente
  setRows(rows => rows.map(r => 
    r.id === id ? { ...r, status: 'APPROVED' } : r
  ));
  
  try {
    // 2. Enviar al servidor
    await approve(id);
    showSnack('Aprobado');
  } catch (error) {
    // 3. Revertir si falla
    setRows(oldRows);
    showSnack('Error', 'error');
  }
};
```

---

**4. Imports globales en components (Impacto: 3/10)**

```javascript
import { Button, TextField, Box, Paper, ... } from '@mui/material';
import { Add, Delete, Edit, ... } from '@mui/icons-material';
import { useState, useEffect, useCallback, useRef } from 'react';
```

5-6 imports ≈ aceptable. Pero algunos componentes tienen 15+ imports.

**Solución:**
```javascript
// ✅ Crear barrel exports
// /components/ui/index.js
export { Button, TextField, Box, Paper } from '@mui/material';
export { Add, Delete, Edit } from '@mui/icons-material';

// Uso:
import { Button, Add } from '../../components/ui';
```

---

**5. No hay i18n completamente implementado (Impacto: 4/10)**

Existe `src/i18n/` pero:
- Algunos textos hardcodeados en componentes
- Inconsistencia en namespacing
- Sin pluralización

**Ejemplo:**
```jsx
return <span>{mins < 0 ? '-' : ''}${h}h ${String(m).padStart(2, '0')}m</span>;
// ← Hardcodeado, no traducible
```

**Solución:** Ya existe infraestructura, solo completar.

---

---

## 8️⃣ BACKEND .NET ESPECÍFICO

### ✅ LO BIEN HECHO

**1. DbContext bien configurado**

```csharp
modelBuilder.Entity<Employee>(entity =>
{
    entity.HasKey(e => e.EmployeeId);
    entity.HasIndex(e => e.EmployeeCode).IsUnique();
    entity.HasOne(e => e.Manager)
        .WithMany(e => e.Subordinates)
        .HasForeignKey(e => e.ManagerEmployeeId)
        .OnDelete(DeleteBehavior.Restrict);
});
```

✅ Índices, relaciones jerárquicas, delete behavior explícito

---

**2. Servicios con interfaces**

```csharp
public interface ITimeSummaryService {
    Task<TimeDailySummary?> CalculateDailySummaryAsync(int employeeId, DateTime date);
}

public class TimeSummaryService : ITimeSummaryService { ... }
```

✅ Inyectable, testeable, flexible

---

**3. JWT bien configurado**

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new() {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = issuer,
            // ...
        };
    });
```

✅ Seguro, configurable

---

### ⚠️ PROBLEMAS

**1. No hay middleware global de errores (Impacto: 7/10)**

Cada controller hace:
```csharp
try {
    // ...
} catch (Exception ex) {
    return StatusCode(500, new { message = "Error", detail = ex.Message });
}
```

**Problema:**
- Inconsistencia en formatos de error
- Algunos errores no se catchean
- Exposición de detalles técnicos (ex.Message) en producción

**Solución:**
```csharp
// ✅ ExceptionHandlingMiddleware
public class ExceptionHandlingMiddleware
{
    public async Task InvokeAsync(HttpContext context, ILogger<ExceptionHandlingMiddleware> logger)
    {
        try {
            await _next(context);
        } catch (Exception ex) {
            logger.LogError(ex, "Unhandled exception");
            
            var response = new { 
                message = "Internal server error",
                traceId = context.TraceIdentifier // para debugging
            };
            
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(response);
        }
    }
}

// Program.cs
app.UseMiddleware<ExceptionHandlingMiddleware>();
```

---

**2. Falta de response wrapper consistente (Impacto: 5/10)**

Respuestas inconsistentes:
```csharp
// Algunos endpoints:
return Ok(employee);

// Otros:
return Ok(new { message = "Success", data = employee });

// Otros:
return Ok(new { employee });
```

**Problema:** Cliente no sabe si response.data o solo response contiene los datos

**Solución:**
```csharp
// ✅ Response wrapper
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }
}

// Siempre retornar:
return Ok(new ApiResponse<Employee> {
    Success = true,
    Data = employee,
    Message = "Employee retrieved"
});
```

---

**3. Validación de permisos repetida (Impacto: 6/10)**

En cada controller:
```csharp
var userIdClaim = User.FindFirst("userId")?.Value;
if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
    return Unauthorized();

var user = await _context.Users.SingleAsync(u => u.UserId == userId);

// Luego validar permisos
if (!isAdminOrRrhh && !isSelf)
    return Forbid();
```

**Repetido en 5+ controllers** = lógica duplicada

**Solución:**
```csharp
// ✅ Extension method
public static async Task<int?> GetUserIdAsync(this HttpContext context, ILogger logger)
{
    var claim = context.User.FindFirst("userId")?.Value;
    if (!int.TryParse(claim, out var userId)) {
        logger.LogWarning("Invalid userId claim");
        return null;
    }
    return userId;
}

// Uso:
var userId = await HttpContext.GetUserIdAsync(_logger);
if (userId == null) return Unauthorized();
```

---

**4. No hay validación de entrada con FluentValidation (Impacto: 6/10)**

Validaciones manuales:
```csharp
if (!TimeSpan.TryParse(dto.ExpectedStartTime, out var start)) 
    return BadRequest(new { message = "Invalid time format" });
```

Dispersas en controllers.

**Solución:**
```csharp
// ✅ FluentValidation
public class CreateVacationRequestDtoValidator : AbstractValidator<CreateVacationRequestDto>
{
    public CreateVacationRequestDtoValidator()
    {
        RuleFor(x => x.StartDate)
            .NotEmpty()
            .Must(d => d >= DateTime.UtcNow.Date)
            .WithMessage("Start date must be today or later");

        RuleFor(x => x.EndDate)
            .NotEmpty()
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("End date must be >= start date");
    }
}

// Program.cs
builder.Services.AddValidatorsFromAssemblyContaining<CreateVacationRequestDtoValidator>();

// Controller
public async Task<IActionResult> CreateRequest([FromBody] CreateVacationRequestDto dto)
{
    // Validación ejecutada automáticamente
    var request = new VacationRequests { ... };
}
```

---

**5. DTOs demasiado anidados/complejos (Impacto: 4/10)**

Algunos DTOs incluyen entidades relacionadas:
```csharp
// VacationRequestResponseDto
public class VacationRequestResponseDto
{
    public int RequestId { get; set; }
    public Employee Employee { get; set; }        // ← Entidad completa
    public List<VacationRequest_Days> RequestDays { get; set; } // ← Relación
    public AbsenceCalendar AbsenceCalendar { get; set; } // ← Más relaciones
}
```

**Problema:**
- Serializa datos innecesarios
- Cambios en entidades rompen DTOs
- Difícil de ver qué envía realmente

**Solución:**
```csharp
// ✅ DTOs planos
public class VacationRequestResponseDto
{
    public int RequestId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int RequestedDays { get; set; }
    public string Status { get; set; }
    // Solo lo que frontend necesita
}
```

---

---

## 9️⃣ OPORTUNIDADES DE MEJORA INMEDIATAS

### TOP 5 PROBLEMAS CRÍTICOS A ARREGLAR AHORA

**1. ⚡ N+1 Queries en TimeSummaryService (CRÍTICO)**

| Prioridad | Esfuerzo | Impacto | Beneficio |
|-----------|----------|--------|-----------|
| 🔴 CRÍTICA | 2h | 8/10 | 15x speedup |

**Acción:** Refactorizar a batch queries (ver sección 2️⃣ Escalabilidad)

---

**2. ⚡ Agregar Global Exception Middleware (IMPORTANTE)**

| Prioridad | Esfuerzo | Impacto | Beneficio |
|-----------|----------|--------|-----------|
| 🟠 ALTA | 1h | 7/10 | Mantenibilidad x5 |

**Acción:** Implementar ExceptionHandlingMiddleware

---

**3. ⚡ Eliminar adminService.js (IMPORTANTE)**

| Prioridad | Esfuerzo | Impacto | Beneficio |
|-----------|----------|--------|-----------|
| 🟠 ALTA | 15min | 7/10 | Código limpio |

**Acción:** Verificar usos, eliminar duplicados, consolidar en employeesService

---

**4. ⚡ Agregar Error Boundary en React (IMPORTANTE)**

| Prioridad | Esfuerzo | Impacto | Beneficio |
|-----------|----------|--------|-----------|
| 🟠 ALTA | 1h | 6/10 | Resiliencia |

**Acción:** Envolver App.jsx y módulos principales

---

**5. ⚡ Unificar manejo de errores API (IMPORTANTE)**

| Prioridad | Esfuerzo | Impacto | Beneficio |
|-----------|----------|--------|-----------|
| 🟠 ALTA | 2h | 6/10 | UX consistente |

**Acción:** Crear `mapApiError()` centralizado, usar en todos los hooks

---

### REFACTORINGS MEDIANOS (1-3 DÍAS)

**1. Centralizar validaciones en VacationRequestService**
```
Tiempo: 4h
Acción: Mover lógica `isWeekend` del frontend al backend, 
        devolver validación + cálculos en unificado
```

**2. Implementar Response Wrapper**
```
Tiempo: 6h
Acción: Crear ApiResponse<T>, aplicar en todos 30 endpoints
```

**3. Agregar caché de Calendar**
```
Tiempo: 3h
Acción: IMemoryCache para Calendar_Days (caché 1 hora)
```

---

### REFACTORINGS MAYORES (1+ SEMANA)

**1. Tests unitarios + integración**
```
Tiempo: 5 días
Acción: 40-50 tests críticos (backend + frontend)
```

**2. Documentación completa**
```
Tiempo: 3 días
Acción: Diagrama ER, flujos de datos, guía de desarrollo
```

**3. Optimizar paginación backend**
```
Tiempo: 2 días
Acción: Lazy-load en DataGrid, pagination model
```

---

---

## 🔟 PLAN DE ESCALABILIDAD PARA LAS 3 INICIATIVAS

### INITIATIVE 1: Horarios flexibles por día

**Impacto arquitectónico: BAJO**

**Cambios necesarios:**

1. **Entidad nueva:**
```csharp
public class WorkScheduleDayDetail
{
    public int DayDetailId { get; set; }
    public int WorkScheduleId { get; set; }
    public int DayOfWeek { get; set; } // 0-6
    public TimeSpan ExpectedStartTime { get; set; }
    public TimeSpan ExpectedEndTime { get; set; }
    public int BreakMinutes { get; set; }
    public bool IsWorkDay { get; set; }
    
    public Employee_WorkSchedule WorkSchedule { get; set; }
}
```

2. **Modificar Employee_WorkSchedule:**
```csharp
public class Employee_WorkSchedule
{
    // Quitar:
    // public TimeSpan ExpectedStartTime { get; set; }
    // public TimeSpan ExpectedEndTime { get; set; }
    
    // Agregar:
    public ICollection<WorkScheduleDayDetail> DayDetails { get; set; }
}
```

3. **Actualizar TimeSummaryService:**
```csharp
// Antes:
var workDuration = schedule.ExpectedEndTime - schedule.ExpectedStartTime;

// Después:
var dayDetail = schedule.DayDetails.FirstOrDefault(d => d.DayOfWeek == date.DayOfWeek);
if (dayDetail == null || !dayDetail.IsWorkDay) expectedMinutes = 0;
else {
    var workDuration = dayDetail.ExpectedEndTime - dayDetail.ExpectedStartTime;
    expectedMinutes = (int)workDuration.TotalMinutes - dayDetail.BreakMinutes;
}
```

4. **Migración de datos:**
```sql
-- Crear 7 registros por schedule existente
INSERT INTO WorkScheduleDayDetail (WorkScheduleId, DayOfWeek, ExpectedStartTime, ExpectedEndTime, BreakMinutes, IsWorkDay)
SELECT 
  ws.WorkScheduleId,
  d.DayOfWeek,
  ws.ExpectedStartTime,   -- Mismo para todos (Lun-Vie)
  ws.ExpectedEndTime,
  ws.BreakMinutes,
  CASE WHEN d.DayOfWeek IN (0, 6) THEN 0 ELSE 1 END  -- No labor sáb/dom
FROM Employee_WorkSchedule ws
CROSS JOIN (SELECT 0 AS DayOfWeek UNION ... UNION SELECT 6) d
```

**Performance:** ✅ Sin cambios (query por (EmployeeId, DayOfWeek))

**Complejidad:** **Baja**

---

### INITIATIVE 2: Calendarios por país/región

**Impacto arquitectónico: ALTO**

**Cambios críticos:**

1. **Nueva entidad CalendarTemplate:**
```csharp
public class CalendarTemplate
{
    public int CalendarTemplateId { get; set; }
    public string CountryCode { get; set; } // ES, IN, etc
    public string CountryName { get; set; }
    public string StateName { get; set; }   // Cataluña, Maharashtra
    public string ProvinceCode { get; set; } // BCN, MH
    public bool IsActive { get; set; }
    
    public ICollection<Calendar_Days> CalendarDays { get; set; }
    public ICollection<CompanyConvention> Conventions { get; set; }
}
```

2. **Modificar Calendar_Days:**
```csharp
public class Calendar_Days
{
    // Cambiar PK:
    // [Key]
    // public DateTime Date { get; set; }
    
    // Nuevo:
    [Key]
    public int CalendarDayId { get; set; }
    public int CalendarTemplateId { get; set; }  // FK
    public DateTime Date { get; set; }
    public int? ConventionId { get; set; }        // FK nullable
    public bool IsWeekend { get; set; }
    public bool IsHoliday { get; set; }
    public string? HolidayName { get; set; }
    
    public CalendarTemplate CalendarTemplate { get; set; }
    public CompanyConvention? Convention { get; set; }
}

// Índice combinado:
modelBuilder.Entity<Calendar_Days>()
    .HasIndex(c => new { c.CalendarTemplateId, c.Date })
    .IsUnique();
```

3. **Nueva entidad CompanyConvention:**
```csharp
public class CompanyConvention
{
    public int ConventionId { get; set; }
    public int CalendarTemplateId { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? ValidTo { get; set; }
    public bool IsActive { get; set; }
    
    public CalendarTemplate CalendarTemplate { get; set; }
    public ICollection<Calendar_Days> CalendarDays { get; set; }
}
```

4. **Modificar Employee (opcional):**
```csharp
public class Employee
{
    // Agregar:
    public int? CalendarTemplateId { get; set; }  // FK nullable
    public int? CompanyConventionId { get; set; }  // FK nullable
    
    public CalendarTemplate? CalendarTemplate { get; set; }
    public CompanyConvention? CompanyConvention { get; set; }
}
```

5. **Actualizar TimeSummaryService:**
```csharp
// Resolver calendarTemplate del empleado
var calendarTemplate = employee.CalendarTemplate 
    ?? (await _db.CalendarTemplates.FirstAsync(c => c.CountryCode == "ES"));

var calendarDay = await _db.Calendar_Days
    .AsNoTracking()
    .FirstOrDefaultAsync(c => c.CalendarTemplateId == calendarTemplate.CalendarTemplateId 
                           && c.Date == dateOnly);

bool isWorkingDay = calendarDay == null || (!calendarDay.IsWeekend && !calendarDay.IsHoliday);
```

**Performance:** ⚠️ Requiere caché agresiva (ver sección Escalabilidad)

**Migración:**
```sql
-- 1. Crear template España por defecto
INSERT INTO CalendarTemplate VALUES (1, 'ES', 'España', 'Nacional', 'ES', 1);

-- 2. Mover datos existentes
INSERT INTO Calendar_Days (CalendarTemplateId, Date, IsWeekend, IsHoliday, HolidayName)
SELECT 1, Date, IsWeekend, IsHoliday, HolidayName FROM Calendar_Days_Temp;

-- 3. Asignar template a empleados
UPDATE Employee SET CalendarTemplateId = 1;
```

**Complejidad:** **Alta** - Cambios en 3 entidades

---

### INITIATIVE 3: Reportes mensuales congelados

**Impacto arquitectónico: BAJO**

**Nueva entidad MonthlyReport:**
```csharp
public class MonthlyReport
{
    public int ReportId { get; set; }
    public int EmployeeId { get; set; }
    public int? ManagerId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    
    // Snapshot congelado:
    public int TotalExpectedMinutes { get; set; }
    public int TotalWorkedMinutes { get; set; }
    public int TotalBalanceMinutes { get; set; }
    public int TotalWorkDays { get; set; }
    public int DaysWithIncidents { get; set; }
    public int ApprovedCorrections { get; set; }
    public int PendingCorrections { get; set; }
    public int RejectedCorrections { get; set; }
    
    // Metadata:
    public string ReportStatus { get; set; } // DRAFT, FINAL, SIGNED
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public int GeneratedByUserId { get; set; }
    public DateTime? SignedAt { get; set; }
    public int? SignedByUserId { get; set; }
    public string? Notes { get; set; }
    
    public Employee Employee { get; set; }
    public Employee? Manager { get; set; }
    public Users GeneratedBy { get; set; }
    public Users? SignedBy { get; set; }
}
```

**Nuevos endpoints:**
```csharp
[HttpPost("monthly")]
public async Task<IActionResult> GenerateMonthlyReport(int employeeId, int year, int month)
{
    // 1. Consultar TimeDailySummary para el mes
    var dailySummaries = await _db.TimeDailySummaries
        .Where(s => s.EmployeeId == employeeId
               && s.Date.Year == year
               && s.Date.Month == month)
        .ToListAsync();

    // 2. Congelar valores
    var report = new MonthlyReport {
        EmployeeId = employeeId,
        Year = year,
        Month = month,
        TotalExpectedMinutes = dailySummaries.Sum(s => s.ExpectedMinutes),
        TotalWorkedMinutes = dailySummaries.Sum(s => s.WorkedMinutes),
        // ...
    };

    _db.MonthlyReports.Add(report);
    await _db.SaveChangesAsync();
    return Ok(report);
}

[HttpGet("monthly/{employeeId}/{year}/{month}")]
public async Task<IActionResult> GetMonthlyReport(int employeeId, int year, int month)
{
    var report = await _db.MonthlyReports
        .FirstOrDefaultAsync(r => r.EmployeeId == employeeId 
                             && r.Year == year 
                             && r.Month == month);
    return Ok(report);
}

[HttpPut("monthly/{reportId}/sign")]
public async Task<IActionResult> SignMonthlyReport(int reportId)
{
    var userId = int.Parse(User.FindFirst("userId")!.Value);
    var report = await _db.MonthlyReports.FindAsync(reportId);
    
    report.ReportStatus = "SIGNED";
    report.SignedAt = DateTime.UtcNow;
    report.SignedByUserId = userId;
    
    await _db.SaveChangesAsync();
    return Ok(report);
}
```

**Performance:** ✅ Sin cambios (snapshot, sin queries complejas)

**Complejidad:** **Baja** - Entidad nueva sin dependencias

---

### MATRIZ DE DEPENDENCIAS

```
Initiative 1 (Horarios)
├─ Independiente de 2 y 3
├─ Mejora: Soporte para jornadas variadas
└─ Prioridad: Media (mejora UX)

Initiative 2 (Calendarios)
├─ Independiente de 1 y 3
├─ CRÍTICA para: Cálculos correctos en múltiples países
├─ Impacta: TimeSummaryService, VacationRequestService
└─ Prioridad: ALTA (arquitectura base)

Initiative 3 (Reportes)
├─ Parcial dependencia de 1 (horarios precisos)
├─ Parcial dependencia de 2 (calendarios precisos)
├─ SIN DEPENDENCIA crítica: funciona con sistema actual
└─ Prioridad: Alta (cierre de mes)
```

**Orden recomendado:**
1. **Initiative 2** (Calendarios) → Arquitectura de datos
2. **Initiative 1** (Horarios) → Refinamiento de cálculos
3. **Initiative 3** (Reportes) → Consolidación histórica

---

---

## 📋 RESUMEN EJECUTIVO

### 🎯 Puntuación de salud del proyecto

| Aspecto | Puntuación | Estado |
|---------|-----------|--------|
| Organización | 7/10 | ✅ Bueno |
| Escalabilidad | 5/10 | ⚠️ Problemas críticos |
| Mantenibilidad | 6/10 | ⚠️ Mejoras necesarias |
| Patrones | 7/10 | ✅ Mayormente correcto |
| Testing | 1/10 | ❌ Crítico |
| Documentación | 4/10 | ⚠️ Incompleta |
| **PROMEDIO** | **5.3/10** | ⚠️ EN DESARROLLO |

---

### 🚀 ACCIONES INMEDIATAS (PRÓXIMAS 2 SEMANAS)

| # | Tarea | Esfuerzo | Impacto | Deadline |
|---|-------|----------|--------|----------|
| 1 | Refactorizar TimeSummaryService (batch queries) | 2h | 8/10 | Miércoles |
| 2 | Agregar Global Exception Middleware | 1h | 7/10 | Jueves |
| 3 | Eliminar adminService.js | 15min | 7/10 | Jueves |
| 4 | Agregar Error Boundary React | 1h | 6/10 | Viernes |
| 5 | Unificar mapeo de errores API | 2h | 6/10 | Viernes |

**Total:** ~6.25 horas de trabajo

---

### 📊 PUNTUACIÓN FINAL: 5.3/10

**Recomendación:** El proyecto es funcional pero necesita work de refinement antes de producción a escala.

**Máxima prioridad:** Resolver N+1 queries y agregar tests.

