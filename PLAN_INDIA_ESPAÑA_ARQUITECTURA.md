# 🌍 PLAN ARQUITECTÓNICO: India + España - Fichajas Multi-País

## 📋 RESUMEN EJECUTIVO

Actualmente el sistema maneja fichajes de **UN SOLO TERMINAL** (mismo horario todo los días, un calendar global).  
Se necesita soportar **MÚLTIPLES PAÍSES** con:
- ✅ Terminales fisicamente localizados en cada país/región
- ✅ Diferentes horarios por DÍA DE SEMANA en cada territorio
- ✅ Diferentes festivos (calendarios) por país/región  
- ✅ Zona horaria UTC diferente
- ✅ Diferenciar fichajes de **TERMINAL** vs **APLICACIÓN MANUAL**

---

## 🗄️ TABLA 1: TERRITORY (Nueva) - Maestra Geográfica

Define un país/región con su zona horaria. Es una tabla **administrada manualmente**.
Los terminales físicos se asignan a un Territory por el admin (basándose en su `Descripcion`).

```sql
CREATE TABLE [dbo].[Territory] (
    [TerritoryId] INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Geografía (País obligatorio, Region opcional para sub-calendarios)
    [CountryCode] NVARCHAR(2) NOT NULL,           -- 'ES', 'IN'
    [CountryName] NVARCHAR(100) NOT NULL,         -- 'España', 'India'
    [Region] NVARCHAR(100) NULL,                  -- 'Cataluña', 'Maharashtra' (opcional)
    
    -- Zona horaria
    [UTC] INT NOT NULL DEFAULT(1),                -- Offset UTC (1=España, 5=India IST)
    
    -- Estado
    [IsActive] BIT NOT NULL DEFAULT(1),
    
    -- Auditoría
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    INDEX IX_Territory_Country (CountryCode)
);
```

### Datos de Ejemplo:
```sql
INSERT INTO Territory (CountryCode, CountryName, Region, UTC)
VALUES
('ES', 'España', NULL, 1),             -- España general
('ES', 'España', 'Cataluña', 1),       -- Si se quiere sub-calendario festivos propios
('IN', 'India', NULL, 5);              -- India general
```

> ⚠️ **Nota:** Los campos de Provincia/Filial/Centro no se incluyen en `Territory`.
> Esa información ya reside en `TERMINALESals.Descripcion` ('BCN CENTRAL', 'PUNE TECHPARK').
> El admin asigna manualmente `TerritoryId` en cada fila de `TERMINALESals` desde la UI.

---

## 🗄️ TABLA 2: MODIFICAR TERMINALESals - Agregar TerritoryId

`TERMINALESals` ya existe en tu base de datos con todos los datos del reloj físico.
Estructura actual:
- `Codigo` (char 2) — PK, identificador del reloj → es el mismo valor que `TimeEntry.DeviceId`
- `Descripcion` (char 30) — nombre del centro: 'BCN CENTRAL', 'PUNE TECHPARK'
- `IP`, `Puerto` — datos de red
- `NumeroSerie`, `Modelo`, `Tipo` — datos físicos del aparato
- `UTC` (int) — zona horaria del reloj

Solo hay que **añadir `TerritoryId` como FK** para que el admin pueda asignar cada reloj a su país:

```sql
ALTER TABLE [dbo].[TERMINALESals] ADD
    [TerritoryId] INT NULL;

ALTER TABLE [dbo].[TERMINALESals] ADD
    CONSTRAINT FK_TERMINALESals_Territory 
        FOREIGN KEY (TerritoryId) 
        REFERENCES Territory(TerritoryId);

CREATE INDEX IX_TERMINALESals_Territory 
    ON TERMINALESals(TerritoryId);
```

### Flujo de asignación de Territory por el Admin:
```
1. Los terminales ya existen en TERMINALESals (gestionados por aTimeControl)
   → TerritoryId es NULL hasta que el admin lo asigne

2. Admin ve lista de terminales sin asignar:
   Codigo "01" → Descripcion = "BCN CENTRAL"     → Admin asigna: España
   Codigo "02" → Descripcion = "MAD OFICINA"      → Admin asigna: España
   Codigo "03" → Descripcion = "PUNE TECHPARK"    → Admin asigna: India
   Codigo "04" → Descripcion = "MUMBAI OFFICE"    → Admin asigna: India

3. Una vez asignado, todos los fichajes de ese terminal
   heredan automáticamente: calendario, horario y UTC del Territory
```

### Asignación de ejemplo:
```sql
UPDATE TERMINALESals SET TerritoryId = 1 WHERE Codigo IN ('01', '02');  -- España
UPDATE TERMINALESals SET TerritoryId = 3 WHERE Codigo IN ('03', '04');  -- India
```

> ℹ️ **No se crea ninguna tabla nueva.** `TERMINALESals` ya tiene toda la información necesaria.
> Solo se añade `TerritoryId` para conectar cada reloj con su país/región.
> La entidad C# `TERMINALESals` se crea en el Domain para mapear esta tabla existente.

---

## 🗄️ TABLA 3: MODIFICAR Employee - Agregar TerritoryId

```sql
ALTER TABLE [dbo].[Employees] ADD
    [TerritoryId] INT NULL,
    [Location] NVARCHAR(100) NULL;

ALTER TABLE [dbo].[Employees] ADD
    CONSTRAINT FK_Employee_Territory 
    FOREIGN KEY (TerritoryId) 
    REFERENCES Territory(TerritoryId);
```

**Significado:**
- `TerritoryId`: Asignación **por defecto** al empleado (puede derivarse del terminal más frecuente)
  - Normalmente: el admin la rellena manualmente, o se infiere del `Terminal` por el que más ficha
  - Si `TerritoryId` en `Employee` es NULL → se usa el del `Terminal` del fichaje
- `Location`: Campo de texto libre para referencia interna (ej: número de despacho, planta)

---

## 🗄️ TABLA 4: NUEVA - WorkScheduleTemplate (Maestro de horarios por día)

Plantilla de horario con 7 registros (uno por día de semana).

```sql
CREATE TABLE [dbo].[WorkScheduleTemplate] (
    [WorkScheduleTemplateId] INT IDENTITY(1,1) PRIMARY KEY,
    
    [Name] NVARCHAR(100) NOT NULL,                -- 'Horario Standard ES', 'Horario Pune'
    [TerritoryId] INT NOT NULL,                   -- FK → Para qué territorio
    [Description] NVARCHAR(500),
    
    [IsActive] BIT NOT NULL DEFAULT(1),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_WorkScheduleTemplate_Territory 
        FOREIGN KEY (TerritoryId) 
        REFERENCES Territory(TerritoryId),
    
    INDEX IX_WorkScheduleTemplate_Territory (TerritoryId)
);
```

---

## 🗄️ TABLA 5: NUEVA - WorkScheduleDayDetail (7 registros por empleado/día)

La verdadera definición de horario **por día de semana**.

```sql
CREATE TABLE [dbo].[WorkScheduleDayDetail] (
    [WorkScheduleDayDetailId] INT IDENTITY(1,1) PRIMARY KEY,
    
    [WorkScheduleTemplateId] INT NOT NULL,       -- FK → Template padre
    [DayOfWeek] INT NOT NULL,                    -- 0=Lun, 1=Mar, ..., 6=Dom
    
    [IsWorkDay] BIT NOT NULL DEFAULT(1),         -- SI 0 = Fin de semana/descanso
    [ExpectedStartTime] TIME NULL,               -- Ej: 08:00
    [ExpectedEndTime] TIME NULL,                 -- Ej: 17:00
    [BreakMinutes] INT DEFAULT(60),
    
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_WorkScheduleDayDetail_Template 
        FOREIGN KEY (WorkScheduleTemplateId) 
        REFERENCES WorkScheduleTemplate(WorkScheduleTemplateId),
    
    CONSTRAINT UQ_WorkScheduleTemplate_Day 
        UNIQUE(WorkScheduleTemplateId, DayOfWeek)
);
```

### Datos de Ejemplo - España (Lunes-Viernes 08:00-17:00, Sábado-Domingo OFF):
```sql
DECLARE @templateId INT = (SELECT TOP 1 WorkScheduleTemplateId 
                           FROM WorkScheduleTemplate 
                           WHERE Name = 'Horario Standard ES');

-- Lunes
INSERT INTO WorkScheduleDayDetail (WorkScheduleTemplateId, DayOfWeek, IsWorkDay, ExpectedStartTime, ExpectedEndTime, BreakMinutes)
VALUES (@templateId, 0, 1, '08:00', '17:00', 60);

-- Martes-Viernes igual
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 1, 1, '08:00', '17:00', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 2, 1, '08:00', '17:00', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 3, 1, '08:00', '17:00', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 4, 1, '08:00', '17:00', 60);

-- Sábado-Domingo OFF
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 5, 0, NULL, NULL, 0);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 6, 0, NULL, NULL, 0);
```

### Datos de Ejemplo - India (6 días de trabajo, diferente horario):
```sql
DECLARE @templateId INT = (SELECT TOP 1 WorkScheduleTemplateId 
                           WHERE Name = 'Horario Pune');

-- Lunes-Sábado (09:00-18:30, India empieza mas tarde)
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 0, 1, '09:00', '18:30', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 1, 1, '09:00', '18:30', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 2, 1, '09:00', '18:30', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 3, 1, '09:00', '18:30', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 4, 1, '09:00', '18:30', 60);
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 5, 1, '09:00', '13:00', 30); -- Sábado media jornada

-- Domingo OFF
INSERT INTO WorkScheduleDayDetail VALUES (@templateId, 6, 0, NULL, NULL, 0);
```

---

## 🗄️ TABLA 6: MODIFICAR Employee_WorkSchedule - Link to WorkScheduleTemplate

```sql
ALTER TABLE [dbo].[Employee_WorkSchedules] ADD
    [WorkScheduleTemplateId] INT NULL;

ALTER TABLE [dbo].[Employee_WorkSchedules] ADD
    CONSTRAINT FK_WorkSchedule_Template 
        FOREIGN KEY (WorkScheduleTemplateId) 
        REFERENCES WorkScheduleTemplate(WorkScheduleTemplateId);

-- Índices para queries rápidas
CREATE INDEX IX_WorkSchedule_EmployeeTemplate 
    ON Employee_WorkSchedules(EmployeeId, WorkScheduleTemplateId);
```

**Cambio de semántica:**
```
ANTES: Employee_WorkSchedule.ExpectedStartTime = una sola hora para todo el día
AHORA: Employee_WorkSchedule → WorkScheduleTemplateId → 7x WorkScheduleDayDetail

NOTA: El Territory se obtiene indirectamente vía WorkScheduleTemplate.TerritoryId
      No se almacena TerritoryId en Employee_WorkSchedule para evitar redundancia
```

---

## 🗄️ TABLA 7: NUEVA - CalendarTemplate

```sql
CREATE TABLE [dbo].[CalendarTemplate] (
    [CalendarTemplateId] INT IDENTITY(1,1) PRIMARY KEY,
    
    [TerritoryId] INT NOT NULL,                  -- FK → Para qué territorio
    [Name] NVARCHAR(100) NOT NULL,               -- 'Calendario España 2026'
    [Year] INT NOT NULL,
    
    [IsDefault] BIT NOT NULL DEFAULT(0),
    [IsActive] BIT NOT NULL DEFAULT(1),
    
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_CalendarTemplate_Territory 
        FOREIGN KEY (TerritoryId) 
        REFERENCES Territory(TerritoryId),
    
    CONSTRAINT UQ_CalendarTemplate_Territory_Year 
        UNIQUE(TerritoryId, Year),
    
    INDEX IX_CalendarTemplate_Territory (TerritoryId)
);
```

---

## 🗄️ TABLA 8: MODIFICAR Calendar_Days - Multi-Territory

Cambiar de una PK global por fecha a una compuesta con CalendarTemplate:

```sql
-- PASOS:
-- 1. Crear nueva columna
ALTER TABLE [dbo].[Calendar_Days] ADD
    [CalendarTemplateId] INT NULL,
    [CompanyConventionId] INT NULL,
    [CalendarDayId] INT IDENTITY(1,1);

-- 2. Valores por defecto (migración en segunda fase)
-- 3. Change PK
ALTER TABLE [dbo].[Calendar_Days] 
    DROP CONSTRAINT PK_Calendar_Days;

ALTER TABLE [dbo].[Calendar_Days]
    ADD CONSTRAINT PK_Calendar_Days_New 
    PRIMARY KEY (CalendarTemplateId, Date);

-- 4. FK
ALTER TABLE [dbo].[Calendar_Days] ADD
    CONSTRAINT FK_Calendar_Days_Template 
        FOREIGN KEY (CalendarTemplateId) 
        REFERENCES CalendarTemplate(CalendarTemplateId);

-- 5. Índices
CREATE INDEX IX_Calendar_Days_Template 
    ON Calendar_Days(CalendarTemplateId);
CREATE INDEX IX_Calendar_Days_Date 
    ON Calendar_Days(Date);
```

### Datos de Ejemplo - Festivos España 2026:
```sql
DECLARE @templateId INT = (SELECT TOP 1 CalendarTemplateId 
                              FROM CalendarTemplate 
                              WHERE Name = 'Calendario España 2026');

INSERT INTO Calendar_Days 
(CalendarTemplateId, Date, IsHoliday, HolidayName, IsWeekend)
VALUES
(@templateId, '2026-01-01', 1, 'Año Nuevo', 0),
(@templateId, '2026-01-06', 1, 'Reyes', 0),
(@templateId, '2026-04-10', 1, 'Viernes Santo', 0),
(@templateId, '2026-05-01', 1, 'Día del Trabajo', 0),
(@templateId, '2026-08-15', 1, 'Asunción de María', 0),
(@templateId, '2026-10-12', 1, 'Fiesta Nacional', 0),
(@templateId, '2026-11-01', 1, 'Día de Todos los Santos', 0),
(@templateId, '2026-12-06', 1, 'Día Constitución', 0),
(@templateId, '2026-12-25', 1, 'Navidad', 0);
```

### Datos de Ejemplo - Festivos India 2026:
```sql
DECLARE @templateId INT = (SELECT TOP 1 CalendarTemplateId 
                              FROM CalendarTemplate 
                              WHERE Name = 'Calendario India 2026');

INSERT INTO Calendar_Days 
(CalendarTemplateId, Date, IsHoliday, HolidayName, IsWeekend)
VALUES
(@templateId, '2026-01-26', 1, 'Republic Day', 0),
(@templateId, '2026-03-29', 1, 'Holi', 0),
(@templateId, '2026-08-15', 1, 'Independence Day', 0),
(@templateId, '2026-10-02', 1, 'Gandhi Jayanti', 0),
(@templateId, '2026-10-24', 1, 'Diwali', 0),
(@templateId, '2026-12-25', 1, 'Christmas', 0);
```

---

## 🗄️ TABLA 9: MODIFICAR TimeEntries - Convertir DeviceId en FK real

`TimeEntry` ya tiene el campo `DeviceId` (string), pero es un texto suelto sin relación a nada.
Hay que convertirlo en una **FK real a `TERMINALESals.Codigo`** y añadir `SourceType`:

```sql
-- Añadir SourceType (el DeviceId ya existe, pero como string suelto)
ALTER TABLE [dbo].[TimeEntries] ADD
    [SourceType] NVARCHAR(20) NOT NULL DEFAULT 'APP_MANUAL';  -- 'TERMINAL', 'APP_MANUAL', 'CORRECTION'

-- Crear FK de DeviceId → TERMINALESals.Codigo
-- (DeviceId ya existe como NVARCHAR, Codigo es CHAR(2) → asegurar compatibilidad de tipos)
ALTER TABLE [dbo].[TimeEntries] ADD
    CONSTRAINT FK_TimeEntry_Terminal 
        FOREIGN KEY (DeviceId) 
        REFERENCES TERMINALESals(Codigo);

-- Índices críticos para cálculos rápidos
CREATE INDEX IX_TimeEntry_DeviceId_Date 
    ON TimeEntries(DeviceId, EventTime);
CREATE INDEX IX_TimeEntry_SourceType 
    ON TimeEntries(SourceType);
```

**Cambio de semántica:**
```
ANTES: DeviceId (nvarchar) - String suelto, sin relación a nada
AHORA: DeviceId (FK) → TERMINALESals.Codigo → TerritoryId → España/India
       Permite: "Este fichaje viene del reloj 01 (BCN CENTRAL) → España"
```

---

## 📊 FLUJO: Cómo se procesa un "Fichaje de Terminal"

### Entrada: FICHAJESals (aTimeControl)
```
FICHAJESals
├─ IdEmpleado = "00123"
├─ Fecha = "2026-03-20"
├─ Hora = "08:45"
├─ IdTerminal = "01"           ← CLAVE
├─ TarjetaEmpleado = "E12345"
├─ Manual = 0                  ← NO es manual (es terminal)
├─ UbicacionEmpleado = "01"    ← Filial Barcelona
└─ CentroEmpleado = "A"
```

### Procesamiento en SistemaFichaje:
```
1. Buscar TERMINALESals por Codigo = "01"
   → TERMINALESals.Descripcion = 'BCN CENTRAL'
   → TERMINALESals.TerritoryId = 1 (asignado por admin: España)

2. Territory.Id = 1
   → CountryCode = 'ES'
   → UTC = 1

3. Buscar Employee por Tarjeta = "E12345"
   → Employee.EmployeeId = 123
   → Employee.TerritoryId = 1 (España) ✓ Match (o NULL → hereda del Terminal)

4. Buscar Employee_WorkSchedule válida
   → Employee_WorkSchedule.WorkScheduleTemplateId = 5
   → WorkScheduleTemplate.TerritoryId = 1 (España) ✓

5. Hoy es sábado (DayOfWeek = 5)
   → WorkScheduleDayDetail(templateId=5, dayOfWeek=5)
   → IsWorkDay = 0 (sábado es no laborable)
   → ExpectedStartTime/EndTime = NULL

6. Crear TimeEntry
   → TimeEntry.EmployeeId = 123
   → TimeEntry.DeviceId = '01' (FK → TERMINALESals.Codigo)
   → TimeEntry.EventTime = 2026-03-20 08:45:00
   → TimeEntry.SourceType = 'TERMINAL'
   → TimeEntry.GeoLocation = <derivado de Territory>

7. Calcular BalanceMinutes
   → Como es sábado (IsWorkDay = 0), no cuenta horas extras
   → Balance = 0
```

---

## 📊 FLUJO: Fichaje Manual desde APP

### Entrada: TimeEntry.Create(Manual)
```
Frontend (India employee)
├─ Employee selecciona su ubicación (Pune) O la heredada del login
├─ Click "Entrada"
├─ TimeEntry.create({
    EmployeeId: 456,
    EntryType: 'IN',
    EventTime: now(),
    SourceType: 'APP_MANUAL',      ← NO es terminal
    TerritoryId: 3 (Pune)
  })
```

### Procesamiento:
```
1. Employee.TerritoryId = 3 (Pune)
2. Territory.Id = 3
   → CountryCode = 'IN'
   → UTC = 5 (India Standard Time)

3. Hoy es lunes (DayOfWeek = 0)
   → WorkScheduleDayDetail (Pune template, Monday)
   → IsWorkDay = 1
   → ExpectedStartTime = 09:00
   → ExpectedEndTime = 18:30

4. Crear TimeEntry
   → TimeEntry.EmployeeId = 456
   → TimeEntry.DeviceId = NULL (no hay terminal, es manual)
   → TimeEntry.EventTime = 2026-03-20 12:30:00 UTC+5:30
   → TimeEntry.SourceType = 'APP_MANUAL'

5. Calcular horas con UTC correcto (India = UTC+5:30)
```

---

## 🔄 MAPEO MIGRACIÓN: aTimeControl → SistemaFichaje

| Tabla | Campo | → | Tabla SistemaFichaje | Campo | Notas |
|-|-|-|-|-|-|
| **TERMINALESals** | Codigo | → | **TERMINALESals** (entidad C#) | Codigo (PK) | Ya existe en BD, solo mapear en C# |
| | **Descripcion** | — | — | — | ⭐ Info del centro: 'BCN CENTRAL', 'PUNE TECHPARK' |
| | IP, Puerto, NumeroSerie... | — | — | — | Ya disponibles en TERMINALESals |
| | UTC | — | — | — | Referencia; el UTC real viene de Territory |
| | *(Nueva columna)* | — | TERMINALESals | **TerritoryId** | ⭐ **Admin asigna** basándose en Descripcion |
| **EMPLEADOSals** | Tarjeta | → | **Employee** | Tarjeta | Direct sync |
| | IdHorario | → | **WorkScheduleTemplate** | (referencia) | Expand 1→7 días |
| | IdCalendario | → | **CalendarTemplate** | (referencia) | Reusar |
| | *(Manual)* | → | **Employee** | **TerritoryId** | Admin o inferido del terminal que más usa |
| **FICHAJESals** | IdEmpleado + Fecha + Hora | → | **TimeEntry** | EmployeeId + EventTime | Join + transform fecha |
| | **IdTerminal** | → | TimeEntry | **DeviceId** (FK → TERMINALESals.Codigo) | ⭐ Ya existe, convertir a FK real |
| | **Manual = 0** | → | TimeEntry | **SourceType = 'TERMINAL'** | Fichaje de terminal físico |
| | **Manual = 1** | → | TimeEntry | **SourceType = 'APP_MANUAL'** | Entrada manual |
| | TarjetaEmpleado | → | TimeEntry | Tarjeta | Trazabilidad de la tarjeta usada |

> ⚠️ **Campos NO mapeados de EMPLEADOSals:** `IdUbicacion`, `IdCentro`, `Provincia` → no contienen
> datos de ubicación útiles. La ubicación geográfica real viene **exclusivamente** de
> `TERMINALESals.Descripcion` → asignación admin a `Territory`.

---

## ✅ BENEFICIOS DE ESTA ARQUITECTURA

### 1. **Diferenciar Fichajes Terminal vs App**
```
SELECT * FROM TimeEntry 
WHERE SourceType = 'TERMINAL'  -- Automáticos de terminal
   OR SourceType = 'APP_MANUAL' -- Manuales de app
```

### 2. **Calcular Horas Correctamente por Territorio**
```
-- Query en TimeSummaryService.CalculateDailySummaryAsync()
var territory = await _db.Territories
    .FirstAsync(t => t.TerritoryId == employee.TerritoryId);

var dayDetail = await _db.WorkScheduleDayDetails
    .Where(w => w.WorkScheduleTemplateId == employee_ws.WorkScheduleTemplateId
             && w.DayOfWeek == (int)date.DayOfWeek)
    .FirstAsync();

var expectedMinutes = dayDetail.IsWorkDay 
    ? (dayDetail.ExpectedEndTime - dayDetail.ExpectedStartTime).TotalMinutes - dayDetail.BreakMinutes
    : 0;

// Redondear según Territory.UTC
var adjustedEventTime = eventTime.AddHours(territory.UTC);
```

### 3. **Aplicar Festivos Correctamente**
```
var calendarDay = await _db.Calendar_Days
    .FirstAsync(c => c.CalendarTemplateId == territory.CalendarTemplateId
                  && c.Date == dateOnly);

if (calendarDay.IsHoliday)
    expectedMinutes = 0; // No es día laborable
```

### 4. **Horarios Flexibles por Día**
```
// Lunes-Viernes: 08:00-17:00
// Sábado: 08:00-13:00
// Domingo: OFF
// España vs India: horarios completamente diferentes

var workScheduleByDay = await _db.WorkScheduleDayDetails
    .Where(w => w.WorkScheduleTemplateId == wsId
             && w.DayOfWeek == dayOfWeek)
    .FirstAsync(); // Solo 1 fila
```

### 5. **Multi-país sin conflictos**
```
// Cada territorio tiene su propio:
// - Calendar (festivos propios)
// - WorkScheduleTemplate (horarios propios)
// - TimeZone (UTC propio)
// - Employees (asignados solo a su territorio)

SELECT e.FullName, t.CountryCode, t.UTC
FROM Employees e
JOIN Territory t ON e.TerritoryId = t.TerritoryId
WHERE t.CountryCode = 'IN'  -- Todos los de India
```

---

## 🚀 PLAN IMPLEMENTACIÓN

### **FASE 1: Infraestructura (BD)**
- [ ] Create `Territory` table
- [ ] Modify `TERMINALESals` (add TerritoryId FK)
- [ ] Create `WorkScheduleTemplate` table
- [ ] Create `WorkScheduleDayDetail` table
- [ ] Create `CalendarTemplate` table
- [ ] Modify `Calendar_Days` (PK + FK)
- [ ] Modify `Employee` (add TerritoryId)
- [ ] Modify `Employee_WorkSchedule` (add WorkScheduleTemplateId, remove TerritoryId)
- [ ] Modify `TimeEntries` (add TerminalId+SourceType)

### **FASE 2: Entidades (C# Domain)**
- [ ] Create `Territory.cs`
- [ ] Create `TERMINALESals.cs` (mapear tabla existente + TerritoryId)
- [ ] Create `WorkScheduleTemplate.cs`
- [ ] Create `WorkScheduleDayDetail.cs`
- [ ] Create `CalendarTemplate.cs` (enhance exists)
- [ ] Update `Employee.cs`
- [ ] Update `Employee_WorkSchedule.cs` (add WorkScheduleTemplateId FK)
- [ ] Update `TimeEntry.cs`
- [ ] Update `Calendar_Days.cs`

### **FASE 3: Datos Maestros (Seed)**
- [ ] Insert `Territory` (ES + IN con sub-regiones)
- [ ] Update `TERMINALESals` (asignar TerritoryId a cada reloj)
- [ ] Insert `WorkScheduleTemplate` (ES standard, IN standard)
- [ ] Insert `WorkScheduleDayDetail` (7xES + 7xIN)
- [ ] Insert `CalendarTemplate` (ES + IN, year 2026)
- [ ] Insert `Calendar_Days` (festivos ES + IN)

### **FASE 4: Servicios (C# Logic)**
- [ ] Update `TimeSummaryService.CalculateDailySummaryAsync()`
  - Usar Territory.UTC
  - Usar WorkScheduleDayDetail por día
  - Usar CalendarTemplate.Calendar_Days
- [ ] Update `TimeEntry` creation logic (DeviceId → TERMINALESals → TerritoryId, determinar SourceType)

### **FASE 5: Controllers (API)**
- [ ] Update `TimeEntriesController` (pass Territory context)
- [ ] Update `EmployeesController` (show Territory)
- [ ] Create `TerritoryController` (GET all territories)
- [ ] Create `TerminalsController` (GET TERMINALESals, PUT assign TerritoryId)

### **FASE 6: Frontend (React)**
- [ ] Add Territory selector en login (si multi-territory)
- [ ] Show Territory info en Employee detail
- [ ] Show Territory calendar en Time summary
- [ ] Show source type (TERMINAL vs APP_MANUAL) en TimEntry list

### **FASE 7: Validación**
- [ ] Test con fechas ES vs IN
- [ ] Test festivos diferentes
- [ ] Test horarios diferentes por día
- [ ] Test TimeEntry source identification

---

## 📌 NOTAS IMPORTANTES

### 1. **DeviceId → TERMINALESals.Codigo**
- **DeviceId** en `TimeEntry` es el mismo valor que `TERMINALESals.Codigo` (ej: "01", "03")
- No se crea tabla `Terminal` nueva — se usa directamente `TERMINALESals` añadiéndole `TerritoryId`
- La entidad C# `TERMINALESals` mapea la tabla existente y se añade como DbSet en el AppDbContext

### 2. **UTC vs Local Time**
- Almacenar siempre en UTC en BD
- Convertir al momento de mostrar (Frontend usando Territory.UTC)
- TimeSummaryService debe hacer cálculos basados en Territory.UTC

### 3. **Migration Path**
- Todos los históricos (`TimeEntry`, `Calendar_Days`) necesitan migración
- Usar `Migration` en EF Core
- Setear valores por defecto (Territory=1 para ES)

### 4. **Performance**
- Índices en `TimeEntry` (Terminal, EmployeeId, EventTime)
- Índices en `Calendar_Days` (CalendarTemplateId, Date)
- Índices en `Territory` (LocationCode, CountryCode)
- Lazy-load agregados donde sea posible

### 5. **Testing**
- Unit tests en TimeSummaryService
- Mock TimeZones (España=UTC+1, India=UTC+5:30)
- Test edge cases (cambio de horario, festivos movibles, etc)

