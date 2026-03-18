# 📋 SistemaFichajes - Decisiones Arquitectónicas

**Proyecto:** Sistema de control de asistencia y vacaciones con jornadas flexibles por día/país
**Ubicación:** `c:\Users\jvalderrama\Desktop\Proyectos\SistemaFichajes`
**Frontend:** React (vite)
**Backend:** C# .NET 8 + EF Core + SQL Server
**BD Actual:** SistemaFichajesVacacionesDev
**Fecha Decisiones:** 18-03-2026

---

## 🎯 3 GRANDES INICIATIVAS IDENTIFICADAS

### 1️⃣ HORARIOS FLEXIBLES POR DÍA (OPCIÓN 1 - IMPLEMENTAR)
**Problema:** Un empleado solo puede tener 1 horario (ej: 8-18 todos los días)
**Solución:** Separar horario en 7 registros (uno por día de la semana)

**Caso de Uso:**
- Lunes-Jueves: 8:00-17:30 (60 min break)
- Viernes: 8:00-14:00 (30 min break, jornada intensiva)
- Sábado-Domingo: No laborables

**Nuevas entidades:**
- `WorkScheduleDayDetail` - Detalle de cada día (Lunes-Domingo)
  - DayDetailId (PK)
  - WorkScheduleId (FK)
  - DayOfWeek (0-6)
  - ExpectedStartTime, ExpectedEndTime
  - BreakMinutes
  - IsWorkDay

**Cambios en entidades existentes:**
- `Employee_WorkSchedule`: QUITAR ExpectedStartTime/EndTime, AGREGAR colección DayDetails
- `Calendar_Days`: Mantener igual

**Ubicación código:**
- Entidad: `SistemaFichajesVacaciones.Domain/Entities/WorkScheduleDayDetail.cs` (CREAR)
- DbContext: `SistemaFichajesVacaciones.Infrastructure/AppDbContext.cs` (MODIFICAR)
- Controller: `SistemaFichajesVacaciones.Api/Controllers/WorkSchedulesController.cs` (ACTUALIZAR)

**Estado:** ⏳ PENDIENTE IMPLEMENTACIÓN

---

### 2️⃣ CALENDARIOS POR PAÍS/REGIÓN (OPCIÓN 1 - DISEÑADO)
**Problema:** Todos los empleados usan mismo calendario. India ≠ España en festivos
**Solución:** Estructura jerárquica País → Región → Provincia con convenios empresa

**Caso de Uso:**
- Empleado en España-Cataluña: festivos españoles + catalanes
- Empleado en India-Maharashtra: festivos indios (Holi, Diwali)
- Cada empresa puede tener días especiales (Black Friday, cierre anual)

**Nuevas entidades:**
- `CalendarTemplate` - Define calendario por país/región
  - CalendarTemplateId (PK)
  - CountryCode, CountryName (ES, IN, etc)
  - StateName (Cataluña, Maharashtra)
  - ProvinceCode (BCN, MH)
  - IsActive, CreatedAt

- `CompanyConvention` - Días especiales por empresa/departamento
  - ConventionId (PK)
  - CalendarTemplateId (FK)
  - Name, Description, StartDate, ValidTo
  - IsActive

**Cambios en entidades existentes:**
- `Calendar_Days`: 
  - AGREGAR CalendarTemplateId (FK) - la tabla deja de ser única
  - AGREGAR ConventionId (FK, nullable)
  - QUITAR: Region, Location campos (se reemplaza con CalendarTemplate)
  - Cambiar PK de Date a (CalendarTemplateId, Date)

- `Employee`:
  - AGREGAR CalendarTemplateId (FK, nullable)
  - AGREGAR CompanyConventionId (FK, nullable)

**Ubicación código:**
- Entidades: 
  - `SistemaFichajesVacaciones.Domain/Entities/CalendarTemplate.cs` (CREAR)
  - `SistemaFichajesVacaciones.Domain/Entities/CompanyConvention.cs` (CREAR)
  - `SistemaFichajesVacaciones.Domain/Entities/Calendar_Days.cs` (MODIFICAR)
  - `SistemaFichajesVacaciones.Domain/Entities/Employee.cs` (MODIFICAR)
- DbContext: `SistemaFichajesVacaciones.Infrastructure/AppDbContext.cs` (MODIFICAR)
- Servicio actualizar: `SistemaFichajesVacaciones.Infrastructure/Services/TimeSummaryService.cs` - método `CalculateDailySummaryAsync()`

**Estado:** ⏳ PENDIENTE IMPLEMENTACIÓN

---

### 3️⃣ INFORMES MENSUALES CONGELADOS (OPCIÓN B - DISEÑADO)
**Problema:** Informes se generan bajo demanda (datos dinámicos). Si se aprueba corrección después, cambia informe
**Solución:** Capturar snapshot congelado del mes con todas las correcciones aprobadas

**Caso de Uso:**
- Manager genera informe marzo: captura todos los datos de marzo
- Se "congela" ese informe
- Si aparece corrección nueva de marzo después, el informe anterior NO cambia
- Cada corrección nueva genera nuevo estado del informe (versiones)

**Nueva entidad:**
- `MonthlyReport` - Snapshots mensuales de tiempo trabajado
  - ReportId (PK)
  - EmployeeId, ManagerId (FK)
  - Year, Month
  - ReportStatus (DRAFT, FINAL, SIGNED)
  - TotalExpectedMinutes, TotalWorkedMinutes, TotalBalanceMinutes
  - TotalWorkDays, DaysWithIncidents
  - ApprovedCorrections, PendingCorrections, RejectedCorrections
  - GeneratedAt, GeneratedByUserId
  - SignedAt, SignedByUserId
  - Notes

**Nuevos endpoints:**
- `POST /api/reports/monthly` → Generar informe mes
- `GET /api/reports/monthly/{reportId}` → Ver informe
- `PUT /api/reports/monthly/{reportId}/sign` → Firmar (manager)
- `DELETE /api/reports/monthly/{reportId}` → Borrar (si DRAFT)

**Ubicación código:**
- Entidad: `SistemaFichajesVacaciones.Domain/Entities/MonthlyReport.cs` (CREAR)
- Controller: `SistemaFichajesVacaciones.Api/Controllers/ReportsController.cs` (CREAR)
- Servicio: `SistemaFichajesVacaciones.Application/Services/MonthlyReportService.cs` (CREAR)
- DbContext: `SistemaFichajesVacaciones.Infrastructure/AppDbContext.cs` (MODIFICAR)

**Estado:** ⏳ PENDIENTE IMPLEMENTACIÓN

---

## 🔗 ENTIDADES EXISTENTES CLAVE

| Entidad | Ubicación | Notas |
|---------|-----------|-------|
| `Employee` | Domain/Entities | FK a Manager (ManagerEmployeeId) |
| `Employee_WorkSchedule` | Domain/Entities | SERÁ MODIFICADA en iniciativa 1 |
| `Calendar_Days` | Domain/Entities | SERÁ MODIFICADA en iniciativa 2 |
| `TimeEntry` | Domain/Entities | Fichajes entrada/salida (no modificar) |
| `TimeCorrection` | Domain/Entities | Solicitudes de corrección (no modificar) |
| `TimeDailySummary` | Domain/Entities | Resumen diario (SERÁ USADA en iniciativa 3) |
| `AuditLog` | Domain/Entities | Trazabilidad automática |

---

## 📊 RELACIONES FUTURAS (POST-IMPLEMENTACIONES)

```
Employee
├─ CalendarTemplate (Initiative 2) ← Calendario del país/región
├─ CompanyConvention (Initiative 2) ← Días especiales empresa
├─ Employee_WorkSchedule
│  └─ WorkScheduleDayDetail[] (Initiative 1) ← 7 registros (Lun-Dom)
├─ Manager (jerarquía)
├─ Subordinates[] (jerarquía)
├─ TimeEntry[] (fichajes)
├─ TimeCorrection[] (correcciones)
├─ TimeDailySummary[] (resumen diario)
└─ MonthlyReport[] (Initiative 3) ← Informes mensuales
```

---

## 🛠️ DEPENDENCIAS ENTRE INICIATIVAS

```
Initiative 1 (Horarios flexibles) → INDEPENDIENTE
  ✅ Puede implementarse sin Initiative 2 o 3

Initiative 2 (Calendarios por país) → INDEPENDIENTE
  ✅ Puede implementarse sin Initiative 1 o 3

Initiative 3 (Reportes mensuales) → DEPENDE de Initiative 1 (parcialmente)
  ⚠️ Necesita que horarios funcionen bien para cálculos
  ✅ NO depende de Initiative 2 (pero se beneficia)
```

**Orden de implementación recomendado:**
1. Initiative 2 (Calendarios) - simpler, setups datos maestros
2. Initiative 1 (Horarios) - refina cálculos
3. Initiative 3 (Reportes) - usa todo lo anterior

---

## 📝 DATOS MIGRABLES

**Initiative 1 - Migración de horarios existentes:**
- Crear 7 WorkScheduleDayDetail por cada Employee_WorkSchedule existente
- Aplicar mismo horario a todos los días (Lun-Vie = ExpectedStartTime/EndTime, Sab-Dom = 0)

**Initiative 2 - Migración de calendarios:**
- Crear CalendarTemplate para España (por defecto)
- Mover todos los Calendar_Days existentes a ese template
- Crear templates para otros países si aplica

**Initiative 3 - No requiere migración:**
- Los históricos de TimeDailySummary se mantienen como están
- New MonthlyReport se generan onwards

---

## 🚀 PRIORIDADES

- **CRÍTICA:** Initiative 2 + 1 (arquitectura base)
- **ALTA:** Initiative 3 (cierre de reportes)
- **FUTURA:** Mejoras en correcciones, alertas, auditoría avanzada

---

## 📚 REFERENCIAS CLAVE

- **Schema actual:** `ModeloDeDatos.sql`
- **DbContext:** `SistemaFichajesVacaciones.Infrastructure/AppDbContext.cs`
- **Servicios time:** `SistemaFichajesVacaciones.Infrastructure/Services/TimeSummaryService.cs`
- **Controllers existentes:** `SistemaFichajesVacaciones.Api/Controllers/`
- **Auditoría:** `AuditLog.cs` + `IAuditService`

---

## 📋 EJEMPLOS DETALLADOS

### Initiative 1 - Ejemplo Horario
```
Juan García - Horario desde 18-03-2026:
├─ Lunes (DayOfWeek=1): 08:00-17:30, 60 min break ✅
├─ Martes (DayOfWeek=2): 08:00-17:30, 60 min break ✅
├─ Miércoles (DayOfWeek=3): 08:00-17:30, 60 min break ✅
├─ Jueves (DayOfWeek=4): 08:00-17:30, 60 min break ✅
├─ Viernes (DayOfWeek=5): 08:00-14:00, 30 min break ✅ (JORNADA INTENSIVA)
├─ Sábado (DayOfWeek=6): No laborable
└─ Domingo (DayOfWeek=0): No laborable

Total semanal: 9.5 horas * 4 + 5.5 horas = 44.5 horas
```

### Initiative 2 - Ejemplo Calendarios
```
España-Cataluña (Template 1):
├─ 10-04-2026: Viernes Santo (IsHoliday=1)
├─ 01-05-2026: Día del Trabajador (IsHoliday=1)
└─ 11-09-2026: Diada de Cataluña (IsHoliday=1)

India-Maharashtra (Template 2):
├─ 29-03-2026: Holi (IsHoliday=1)
└─ 27-10-2026: Diwali (IsHoliday=1)

Convenio: Jornada Intensiva Verano (01-07 a 31-08)
└─ Sábados son laborables en verano (IsWeekend=1, IsHoliday=1)
```

### Initiative 3 - Ejemplo Informe
```
Informe Mensual - Marzo 2026 - Juan García
═════════════════════════════════════════════
Generado: 31-03-2026 por Manager María
Estado: DRAFT (para revisión)

RESUMEN MENSUAL:
├─ Días laborables: 22
├─ Horas esperadas: 176.5 (22 × 8.025h promedio)
├─ Horas trabajadas: 174.0
├─ Balance: -2.5 horas (debe recuperar)
├─ Correcciones aprobadas: 1 (15-03: +1.5h)
├─ Correcciones pendientes: 0
└─ Correcciones rechazadas: 0

DETALLES DIARIOS:
├─ 01-03 (Viernes): 5.5h ✓
├─ 10-03 (Domingo): 0h (no laborable - Viernes Santo retraso?)
├─ 17-03 (Lunes): 9.5h ✓ (con corrección aprobada)
└─ ...
```

---

**Última actualización:** 18-03-2026
**Estado:** Análisis completado, diseño validado, ready para implementación
**Siguiente paso:** Elegir Initiative para comenzar implementación
