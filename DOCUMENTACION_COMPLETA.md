# 🏗️ DOCUMENTACIÓN COMPLETA - SistemaFichajes

**Documento conforme a la metáfora constructiva: desde los cimientos hasta el techo.**

---

## 📑 TABLA DE CONTENIDOS

1. [Cimientos: Stack Tecnológico](#cimientos-stack-tecnológico)
2. [Planos: Arquitectura General](#planos-arquitectura-general)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
5. [Domain Layer (Entidades)](#domain-layer-entidades)
6. [Infrastructure Layer](#infrastructure-layer)
7. [Application Layer](#application-layer)
8. [API Layer (Controllers)](#api-layer-controllers)
9. [Frontend React](#frontend-react)
10. [Flujos de Negocio](#flujos-de-negocio)
11. [Refactorización y Optimizaciones](#refactorización-y-optimizaciones)

---

# 🔨 CIMIENTOS: STACK TECNOLÓGICO

## Backend (.NET)
```
┌─────────────────────────────────────┐
│     .NET 8 (Framework Moderno)      │
├─────────────────────────────────────┤
│ Entity Framework Core (ORM)         │ → Mapeo automático BD
│ SQL Server 2019+                    │ → Base de datos
│ ASP.NET Core Web API                │ → Servidor HTTP
│ JWT Bearer Authentication           │ → Seguridad
│ Dependency Injection (Built-in)     │ → Inyección de dependencias
├─────────────────────────────────────┤
│ Paquetes NuGet importantes:         │
│ - Microsoft.EntityFrameworkCore     │
│ - Microsoft.AspNetCore.Mvc          │
│ - System.IdentityModel.Tokens.Jwt   │
│ - BCrypt.Net-Next                   │ → Hashing seguro
│ - Swashbuckle (Swagger)             │ → Documentación API
└─────────────────────────────────────┘
```

## Frontend (JavaScript/React)
```
┌─────────────────────────────────────┐
│      React 18 (Componentes)         │
├─────────────────────────────────────┤
│ Vite (Bundler moderno, rápido)      │ → Build tool
│ MUI (Material-UI)                   │ → Componentes visuales
│ Axios                               │ → Cliente HTTP
│ React Router v6                     │ → Navegación
│ i18n (React-i18next)                │ → Multiidioma (ES/EN)
│ date-fns                            │ → Manejo de fechas
├─────────────────────────────────────┤
│ Paquetes importantes:               │
│ - @mui/material                     │
│ - @mui/x-data-grid                  │ → Tablas avanzadas
│ - @mui/x-date-pickers              │ → Selectores de fecha
│ - react-i18next                     │
│ - axios                             │
│ - date-fns                          │
└─────────────────────────────────────┘
```

---

# 📐 PLANOS: ARQUITECTURA GENERAL

## Arquitectura en Capas (Clean Architecture)

```
┌──────────────────────────────────────────────────────────┐
│                   PRESENTACIÓN (Frontend)               │
│            React, Componentes, Páginas, Hooks            │
└────────────────────────┬─────────────────────────────────┘
                         │ (HTTP/REST)
                         ▼
┌──────────────────────────────────────────────────────────┐
│              API LAYER (ASP.NET Controllers)             │
│    TimeEntriesController, EmployeesController, etc.     │
└────────────────────────┬─────────────────────────────────┘
                         │ (Lógica de negocio)
                         ▼
┌──────────────────────────────────────────────────────────┐
│         APPLICATION LAYER (Servicios de Negocio)         │
│  VacationRequestService, VacationBalanceService, etc.    │
└────────────────────────┬─────────────────────────────────┘
                         │ (Reglas de negocio)
                         ▼
┌──────────────────────────────────────────────────────────┐
│       INFRASTRUCTURE LAYER (Acceso a Datos)             │
│    AuthorizationService, TimeSummaryService, DbContext   │
└────────────────────────┬─────────────────────────────────┘
                         │ (Queries EF Core)
                         ▼
┌──────────────────────────────────────────────────────────┐
│               DOMAIN LAYER (Entidades)                   │
│     Employee, TimeEntry, VacationRequest, etc.           │
└────────────────────────┬─────────────────────────────────┘
                         │ (Mapeo ORM)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   SQL SERVER (BD)                        │
│     Tablas, Relaciones, Índices, Procedimientos          │
└──────────────────────────────────────────────────────────┘
```

---

# 📁 ESTRUCTURA DEL PROYECTO

```
SistemaFichajes/
│
├── 📂 SistemaFichajesVacaciones.Domain/
│   ├── Entities/                    ← Modelos de datos (sin lógica)
│   │   ├── Employee.cs             ← Empleado
│   │   ├── TimeEntry.cs            ← Fichaje entrada/salida
│   │   ├── TimeCorrection.cs       ← Solicitud de corrección
│   │   ├── VacationRequest.cs      ← Solicitud de vacaciones
│   │   ├── VacationBalance.cs      ← Balance de días
│   │   ├── TimeDailySummary.cs     ← Resumen diario
│   │   ├── Calendar_Days.cs        ← Días del calendario
│   │   ├── WorkSchedule.cs         ← Horarios
│   │   ├── AuditLog.cs             ← Auditoría
│   │   └── [más entidades]
│   └── SistemaFichajesVacaciones.Domain.csproj
│
├── 📂 SistemaFichajesVacaciones.Infrastructure/
│   ├── AppDbContext.cs             ← Context de Entity Framework
│   ├── Services/
│   │   ├── EmployeeAuthorizationService.cs  ← 🆕 Lógica de autorización
│   │   ├── TimeSummaryService.cs   ← Cálculos de tiempo
│   │   ├── EmployeeImportService.cs ← Importar CSV
│   │   ├── TokenService.cs         ← Generación JWT
│   │   ├── AuditService.cs         ← Registrar cambios
│   │   └── [más servicios]
│   ├── Migrations/                 ← Historial cambios BD
│   ├── Data/                        ← Seed data
│   └── SistemaFichajesVacaciones.Infrastructure.csproj
│
├── 📂 SistemaFichajesVacaciones.Application/
│   ├── Interfaces/
│   │   ├── IVacationRequestService.cs
│   │   ├── IVacationBalanceService.cs
│   │   ├── IAuditService.cs
│   │   └── [más interfaces]
│   ├── Services/
│   │   ├── VacationRequestService.cs  ← Lógica de solicitudes
│   │   ├── VacationBalanceService.cs  ← Cálculo de saldos
│   │   └── [más servicios]
│   ├── DTOs/                        ← Objetos de transferencia
│   │   ├── TimeEntryDto.cs
│   │   ├── EmployeeDto.cs
│   │   └── [más DTOs]
│   └── SistemaFichajesVacaciones.Application.csproj
│
├── 📂 SistemaFichajesVacaciones.Api/
│   ├── Program.cs                  ← Configuración app (DI, JWT, CORS)
│   ├── appsettings.json            ← Configuración conexiones
│   ├── appsettings.Development.json
│   ├── Controllers/                ← Endpoints HTTP
│   │   ├── AuthController.cs       ← Login/Logout
│   │   ├── TimeEntriesController.cs ← Fichajes
│   │   ├── EmployeesController.cs  ← Empleados
│   │   ├── VacationRequestsController.cs
│   │   ├── TimeCorrectionsController.cs
│   │   ├── VacationBalanceController.cs
│   │   ├── AbsenceCalendarController.cs
│   │   ├── WorkSchedulesController.cs
│   │   └── [más controllers]
│   ├── Attributes/
│   │   └── RequireRoleAttribute.cs ← Autorización por rol
│   ├── Middleware/
│   │   └── GlobalExceptionMiddleware.cs ← Manejo global de errores
│   ├── Properties/
│   │   └── launchSettings.json     ← Configuración puertos
│   └── SistemaFichajesVacaciones.Api.csproj
│
├── 📂 frontendReact/
│   ├── index.html                  ← HTML principal
│   ├── vite.config.js              ← Configuración Vite
│   ├── package.json                ← Dependencias NPM
│   ├── eslint.config.js            ← Linting
│   ├── src/
│   │   ├── App.jsx                 ← Componente raíz
│   │   ├── main.jsx                ← Punto entrada
│   │   ├── index.css               ← Estilos globales
│   │   ├── components/             ← Componentes reutilizables
│   │   │   ├── common/             ← Globales (Header, Sidebar, Layout)
│   │   │   ├── ui/                 ← Elementos UI (Botones, Diálogos)
│   │   │   └── [más componentes]
│   │   ├── modules/                ← Módulos por funcionalidad
│   │   │   ├── admin/              ← Gestión admin
│   │   │   │   ├── tabs/
│   │   │   │   │   ├── SchedulesTab.jsx (refactorizado) ✅
│   │   │   │   │   │   └── schedules/components/
│   │   │   │   │   │       ├── EmployeeSelector.jsx
│   │   │   │   │   │       ├── ScheduleGrid.jsx
│   │   │   │   │   │       └── ScheduleForm.jsx
│   │   │   │   │   ├── EmployeesTab.jsx
│   │   │   │   │   ├── ImportTab.jsx
│   │   │   │   │   └── PoliciesTab.jsx
│   │   │   │   └── AdminPage.jsx
│   │   │   ├── time/               ← Control de fichajes
│   │   │   │   ├── clock/
│   │   │   │   │   └── Timeclockpage.jsx
│   │   │   │   ├── history/
│   │   │   │   │   └── History.jsx
│   │   │   │   ├── corrections/
│   │   │   │   │   ├── Corrections.jsx
│   │   │   │   │   └── components/
│   │   │   │   └── TimeModule.jsx
│   │   │   ├── vacations/          ← Gestión vacaciones
│   │   │   │   ├── requests/
│   │   │   │   │   └── VacationRequests.jsx
│   │   │   │   ├── approvals/
│   │   │   │   │   └── VacationApprovals.jsx
│   │   │   │   ├── calendar/
│   │   │   │   │   └── VacationCalendar.jsx
│   │   │   │   └── VacationsModule.jsx
│   │   │   ├── dashboard/          ← Inicio
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── components/
│   │   │   ├── employees/          ← Gestión empleados
│   │   │   │   ├── detail/
│   │   │   │   │   └── Employees.jsx
│   │   │   │   └── EmployeesModule.jsx
│   │   │   └── settings/           ← Configuración usuario
│   │   ├── pages/                  ← Páginas
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/               ← Clientes HTTP
│   │   │   ├── api.js              ← Instancia Axios
│   │   │   ├── authService.js      ← Login/Token
│   │   │   ├── timeService.js      ← Fichajes
│   │   │   ├── employeesService.js ← Empleados
│   │   │   ├── vacationsService.js ← Vacaciones
│   │   │   ├── schedulesService.js ← Horarios
│   │   │   ├── correctionsService.js
│   │   │   └── [más servicios]
│   │   ├── hooks/                  ← Custom Hooks
│   │   │   ├── useScheduleManager.js ← 🆕 Gestión horarios
│   │   │   ├── useSnackbar.js      ← Notificaciones
│   │   │   ├── useFetch.js         ← Fetch genérico
│   │   │   ├── useRole.js          ← Rol usuario
│   │   │   ├── useVacations.js
│   │   │   ├── useDashboard.js
│   │   │   ├── useCorrections.js
│   │   │   ├── useVacationApprovals.js
│   │   │   ├── useEmployees.js
│   │   │   ├── useDialogState.js
│   │   │   └── useNotifications.js
│   │   ├── context/                ← Context API
│   │   │   ├── AuthContext.jsx     ← Sesión usuario
│   │   │   ├── ThemeContext.jsx    ← Tema
│   │   │   └── LanguageContext.jsx ← Idioma
│   │   ├── i18n/                   ← Traducciones
│   │   │   ├── i18n.js
│   │   │   ├── locales/
│   │   │   │   ├── es.json         ← Español
│   │   │   │   └── en.json         ← Inglés
│   │   │   └── [traducciones]
│   │   ├── utils/                  ← Utilidades
│   │   │   ├── helpers/
│   │   │   │   ├── dateUtils.js    ← Formateo fechas
│   │   │   │   ├── roleUtils.js    ← Validación roles
│   │   │   │   └── [más helpers]
│   │   │   └── validators/
│   │   ├── styles/                 ← Estilos compartidos
│   │   │   ├── theme.js            ← Tema MUI
│   │   │   └── globalStyles.js
│   │   └── assets/                 ← Imágenes, iconos
│   └── public/                      ← Archivos estáticos
└── 📄 [Archivos de configuración raíz]
    ├── README.md
    ├── .gitignore
    └── ModeloDeDatos.sql            ← Schema BD
```

---

# 🗄️ BASE DE DATOS (SQL Server)

## Tablas Principales

### 1. **Users** (Autenticación)
```csharp
┌─────────────────────────────────────┐
│ Users (Cuentas)                     │
├─────────────────────────────────────┤
│ ✓ UserId (PK)                       │
│ ✓ EmployeeId (FK)                   │
│ ✓ Email (Unique)                    │
│ ✓ PasswordHash (BCrypt)             │
│ ✓ Role (ADMIN/MANAGER/EMPLOYEE)     │
│ ✓ IsActive                          │
│ ✓ CreatedAt, UpdatedAt              │
└─────────────────────────────────────┘
```

### 2. **Employees** (Empleados)
```csharp
┌─────────────────────────────────────┐
│ Employees                           │
├─────────────────────────────────────┤
│ ✓ EmployeeId (PK)                   │
│ ✓ EmployeeCode (Unique)             │
│ ✓ FullName                          │
│ ✓ Email                             │
│ ✓ Department                        │
│ ✓ Position                          │
│ ✓ ManagerEmployeeId (FK-Employees)  │ ← Relación jerárquica
│ ✓ CalendarTemplateId (FK)           │ ← País/Región 🆕
│ ✓ IsActive                          │
│ ✓ CreatedAt, UpdatedAt              │
└─────────────────────────────────────┘
```

### 3. **Employee_WorkSchedule** (Horarios)
```csharp
┌─────────────────────────────────────┐
│ Employee_WorkSchedule               │
├─────────────────────────────────────┤
│ ✓ WorkScheduleId (PK)               │
│ ✓ EmployeeId (FK)                   │
│ ✓ ValidFrom (DateTime)              │
│ ✓ ValidTo (DateTime, nullable)      │
│ ✓ ExpectedStartTime (TimeSpan)      │
│ ✓ ExpectedEndTime (TimeSpan)        │
│ ✓ BreakMinutes (Descanso)           │
│ ✓ Notes                             │
└─────────────────────────────────────┘
```

### 4. **TimeEntry** (Fichajes)
```csharp
┌─────────────────────────────────────┐
│ TimeEntry (Entrada/Salida)          │
├─────────────────────────────────────┤
│ ✓ TimeEntryId (PK)                  │
│ ✓ EmployeeId (FK)                   │
│ ✓ Time (DateTime)                   │
│ ✓ EntryType (IN/OUT)                │
│ ✓ Source (MANUAL/APP/DEVICE)        │
│ ✓ Comment (nullable)                │
│ ✓ CreatedAt                         │
└─────────────────────────────────────┘
```

### 5. **TimeCorrection** (Correcciones)
```csharp
┌─────────────────────────────────────┐
│ TimeCorrection                      │
├─────────────────────────────────────┤
│ ✓ CorrectionId (PK)                 │
│ ✓ EmployeeId (FK)                   │
│ ✓ Date (DateTime)                   │
│ ✓ Minutes (Minutos a añadir/restar) │
│ ✓ Reason (Motivo)                   │
│ ✓ Status (PENDING/APPROVED/REJECTED)│
│ ✓ ApprovedByUserId (FK, nullable)   │
│ ✓ ApprovedAt (DateTime, nullable)   │
│ ✓ RejectionReason (nullable)        │
│ ✓ CreatedAt, UpdatedAt              │
└─────────────────────────────────────┘
```

### 6. **VacationRequest** (Solicitudes Vacaciones)
```csharp
┌─────────────────────────────────────┐
│ VacationRequest                     │
├─────────────────────────────────────┤
│ ✓ RequestId (PK)                    │
│ ✓ EmployeeId (FK)                   │
│ ✓ StartDate                         │
│ ✓ EndDate                           │
│ ✓ DaysRequested (Cálculo)           │
│ ✓ Status (DRAFT/SUBMITTED/APPROVED) │
│ ✓ ApproverEmployeeId (FK, nullable) │
│ ✓ ApprovedAt (DateTime, nullable)   │
│ ✓ Reason (nullable)                 │
│ ✓ CreatedAt, UpdatedAt              │
└─────────────────────────────────────┘
```

### 7. **VacationBalance** (Saldos)
```csharp
┌─────────────────────────────────────┐
│ VacationBalance                     │
├─────────────────────────────────────┤
│ ✓ BalanceId (PK)                    │
│ ✓ EmployeeId (FK)                   │
│ ✓ Year                              │
│ ✓ InitialDays                       │
│ ✓ UsedDays                          │
│ ✓ RemainingDays (Cálculo)           │
│ ✓ UpdatedAt                         │
└─────────────────────────────────────┘
```

### 8. **TimeDailySummary** (Resumen Diario)
```csharp
┌─────────────────────────────────────┐
│ TimeDailySummary                    │
├─────────────────────────────────────┤
│ ✓ DailySummaryId (PK)               │
│ ✓ EmployeeId (FK)                   │
│ ✓ Date (DateTime)                   │
│ ✓ ExpectedMinutes                   │
│ ✓ WorkedMinutes                     │
│ ✓ BalanceMinutes (Worked - Expected)│
│ ✓ Status (COMPLETE/INCOMPLETE)      │
│ ✓ CreatedAt, LastCheckedAt          │
└─────────────────────────────────────┘
```

### 9. **Calendar_Days** (Calendario)
```csharp
┌─────────────────────────────────────┐
│ Calendar_Days                       │
├─────────────────────────────────────┤
│ ✓ Calendar_DayId (PK)               │
│ ✓ Date (DateTime)                   │
│ ✓ IsHoliday (bool)                  │
│ ✓ IsWeekend (bool)                  │
│ ✓ HolidayName (nullable)            │
│ ✓ CalendarTemplateId (FK)           │ ← País 🆕
└─────────────────────────────────────┘
```

### 10. **AuditLog** (Auditoría)
```csharp
┌─────────────────────────────────────┐
│ AuditLog                            │
├─────────────────────────────────────┤
│ ✓ AuditId (PK)                      │
│ ✓ UserId (FK)                       │
│ ✓ TableName                         │
│ ✓ RecordId                          │
│ ✓ Action (INSERT/UPDATE/DELETE)     │
│ ✓ OldValues (JSON)                  │
│ ✓ NewValues (JSON)                  │
│ ✓ CreatedAt                         │
└─────────────────────────────────────┘
```

## Relaciones (ERD Simplificado)

```
        ┌─────────────┐
        │   Users     │
        └──────┬──────┘
               │ EmployeeId
               │ (FK)
               ▼
        ┌─────────────┐◄─────────────┐
        │  Employees  │              │
        │   (Tabla    │   ManagerEmployeeId
        │   central)  │   (Jerarquía)
        └──────┬──────┘              │
               │                     │
         ┌─────┴─────────────────────┘
         │
    ┌────┴────┬────────────┬──────────┬─────────────┐
    ▼         ▼            ▼          ▼             ▼
┌────────┬──────────┬──────────┬──────────┬────────────┐
│ Time   │ Time     │Vacation  │Vacation  │ Vacation   │
│ Entry  │Correction│ Request  │ Balance  │ Policies   │
└────────┴──────────┴──────────┴──────────┴────────────┘
    ▼         ▼            ▼
 ┌──────────────────────────────────┐
 │   TimeDailySummary (Agregados)   │
 └──────────────────────────────────┘
```

---

# 🏭 DOMAIN LAYER - ENTIDADES

Las entidades son los modelos de datos fundamentales. Se definen en `SistemaFichajesVacaciones.Domain/Entities/`

## Entidad: Employee (Empleado)

```csharp
public class Employee
{
    // Identificador único
    public int EmployeeId { get; set; }
    
    // Datos básicos
    public string EmployeeCode { get; set; }      // Código único (e.g., "EMP001")
    public string FullName { get; set; }          // Nombre completo
    public string Email { get; set; }             // Email de contacto
    public string Department { get; set; }        // Departamento
    public string Position { get; set; }          // Cargo
    
    // Relaciones jerárquicas
    public int? ManagerEmployeeId { get; set; }   // ID del jefe directo
    public Employee Manager { get; set; }         // Referencia al jefe (Navegación)
    public ICollection<Employee> Subordinates { get; set; }  // Lista de subordinados
    
    // Relaciones a otros datos
    public ICollection<TimeEntry> TimeEntries { get; set; }
    public ICollection<TimeCorrection> TimeCorrections { get; set; }
    public ICollection<VacationRequest> VacationRequests { get; set; }
    public ICollection<VacationBalance> VacationBalances { get; set; }
    public ICollection<Employee_WorkSchedule> WorkSchedules { get; set; }
    public ICollection<TimeDailySummary> DailySummaries { get; set; }
    
    // Control
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

## Entidad: TimeEntry (Fichaje)

```csharp
public class TimeEntry
{
    public int TimeEntryId { get; set; }          // PK
    
    public int EmployeeId { get; set; }           // FK
    public Employee Employee { get; set; }        // Navegación
    
    public DateTime Time { get; set; }            // Hora exacta del fichaje
    public string EntryType { get; set; }         // "IN" o "OUT" (Entrada/Salida)
    public string Source { get; set; }            // "MANUAL", "APP", "DEVICE"
    public string Comment { get; set; }           // Comentario opcional
    
    public DateTime CreatedAt { get; set; }
}

/*
Ejemplo uso:
- Empleado llega a las 9:00 AM → TimeEntry(IN, 2024-03-19 09:00, APP)
- Empleado sale a las 18:00 PM → TimeEntry(OUT, 2024-03-19 18:00, APP)
- Sistema calcula: 18:00 - 09:00 = 9 horas trabajadas (menos descanso)
*/
```

## Entidad: TimeCorrection (Corrección)

```csharp
public class TimeCorrection
{
    public int CorrectionId { get; set; }
    
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; }
    
    public DateTime Date { get; set; }            // Día a corregir
    public int Minutes { get; set; }              // Minutos a ajustar (+/-)
    public string Reason { get; set; }            // "Olvidé fichaje", "Sistema falló", etc.
    
    public string Status { get; set; }            // PENDING, APPROVED, REJECTED
    
    // Aprobación
    public int? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string RejectionReason { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/*
Flujo:
1. Empleado crea: "Olvidé fichar a las 9:00 AM" (60 minutos)
2. Status = PENDING
3. Manager revisa y aprueba
4. Status = APPROVED + ApprovedAt = ahora
5. Sistema suma 60 minutos al resumen del día
*/
```

## Entidad: VacationRequest (Solicitud de Vacaciones)

```csharp
public class VacationRequest
{
    public int RequestId { get; set; }
    
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; }
    
    public DateTime StartDate { get; set; }       // Primera día vacaciones
    public DateTime EndDate { get; set; }         // Último día vacaciones
    public int DaysRequested { get; set; }        // Cálculo: EndDate - StartDate
    
    public string Status { get; set; }            // DRAFT, SUBMITTED, APPROVED, REJECTED
    public string Reason { get; set; }            // Motivo opcional
    
    // Aprobación
    public int? ApproverEmployeeId { get; set; }  // FK a Employee (Manager)
    public DateTime? ApprovedAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/*
Flujo:
1. Empleado: "Quiero 5 días de vacaciones (20-24 marzo)"
2. Status = DRAFT
3. Empleado envía → Status = SUBMITTED
4. Manager aprueba → Status = APPROVED
5. Sistema resta 5 días del balance anual
*/
```

(Continúa en próxima sección...)

---

# 🔧 INFRASTRUCTURE LAYER - Acceso a Datos

## AppDbContext (Entity Framework)

```csharp
public class AppDbContext : DbContext
{
    // Constructor
    public AppDbContext(DbContextOptions<AppDbContext> options) 
        : base(options) { }
    
    // DbSets = Tablas
    public DbSet<User> Users { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<TimeCorrection> TimeCorrections { get; set; }
    public DbSet<VacationRequest> VacationRequests { get; set; }
    public DbSet<VacationBalance> VacationBalances { get; set; }
    public DbSet<TimeDailySummary> TimeDailySummaries { get; set; }
    public DbSet<Employee_WorkSchedule> Employee_WorkSchedules { get; set; }
    public DbSet<Calendar_Days> Calendar_Days { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configurar relaciones
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Manager)
            .WithMany(e => e.Subordinates)
            .HasForeignKey(e => e.ManagerEmployeeId);
        
        // Más configuraciones...
    }
}

/*
Uso en una query:
var employee = await dbContext.Employees
    .Include(e => e.TimeEntries)      // Cargar fichajes
    .Include(e => e.Manager)          // Cargar jefe
    .FirstOrDefaultAsync(e => e.EmployeeId == 1);

// Acceso a datos:
var fichajes = employee.TimeEntries;  // Ya están cargados
var jefe = employee.Manager;          // Ya está cargado
*/
```

## EmployeeAuthorizationService (🆕 Refactorizado)

```csharp
public interface IEmployeeAuthorizationService
{
    /// <summary>
    /// Obtiene todos los subordinados directos de un manager
    /// </summary>
    Task<List<int>> GetManagerSubordinateIdsAsync(int managerEmployeeId);
    
    /// <summary>
    /// Verifica si un manager es jefe directo de un empleado
    /// </summary>
    Task<bool> IsManagerOfEmployeeAsync(int managerEmployeeId, int employeeId);
    
    /// <summary>
    /// Valida permisos de forma segura
    /// </summary>
    Task<List<int>?> GetSubordinateIdsSafeAsync(int managerEmployeeId, int requestedEmployeeId);
}

public class EmployeeAuthorizationService : IEmployeeAuthorizationService
{
    private readonly AppDbContext _db;
    
    public async Task<List<int>> GetManagerSubordinateIdsAsync(int managerEmployeeId)
    {
        // Query: SELECT EmployeeId FROM Employees 
        //        WHERE ManagerEmployeeId = @managerEmployeeId
        return await _db.Employees
            .Where(e => e.ManagerEmployeeId == managerEmployeeId)
            .Select(e => e.EmployeeId)
            .ToListAsync();
    }
    
    public async Task<bool> IsManagerOfEmployeeAsync(int managerEmployeeId, int employeeId)
    {
        // Verificación simple: ¿Es X el jefe directo de Y?
        return await _db.Employees
            .AnyAsync(e => e.EmployeeId == employeeId && 
                          e.ManagerEmployeeId == managerEmployeeId);
    }
}

/*
✅ MEJORA: Antes, cada controller tenía este código duplicado. Ahora:
- Reutilizable en 7 controllers
- Testeable
- Centralizado
- -80 líneas de código redundante
*/
```

## TimeSummaryService (Cálculos)

```csharp
public interface ITimeSummaryService
{
    Task CalculateDailySummaryAsync(int employeeId, DateTime date);
}

public class TimeSummaryService : ITimeSummaryService
{
    private readonly AppDbContext _db;
    
    public async Task CalculateDailySummaryAsync(int employeeId, DateTime date)
    {
        // 1. Obtener fichajes del día
        var entries = await _db.TimeEntries
            .Where(e => e.EmployeeId == employeeId 
                   && e.Time.Date == date.Date)
            .OrderBy(e => e.Time)
            .ToListAsync();
        
        // 2. Calcular minutos trabajados
        int workedMinutes = 0;
        if (entries.Count >= 2)
        {
            var firstEntry = entries.First();
            var lastEntry = entries.Last();
            workedMinutes = (int)((lastEntry.Time - firstEntry.Time).TotalMinutes);
            
            // Restar descanso
            var schedule = await GetScheduleForDateAsync(employeeId, date);
            if (schedule != null)
                workedMinutes -= schedule.BreakMinutes;
        }
        
        // 3. Obtener minutos esperados del horario
        var expectedSchedule = await GetScheduleForDateAsync(employeeId, date);
        int expectedMinutes = expectedSchedule?.CalculateExpectedMinutes() ?? 0;
        
        // 4. Crear/actualizar resumen
        var summary = await _db.TimeDailySummaries
            .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.Date == date.Date);
        
        if (summary == null)
        {
            summary = new TimeDailySummary
            {
                EmployeeId = employeeId,
                Date = date.Date,
                ExpectedMinutes = expectedMinutes,
                WorkedMinutes = workedMinutes,
                BalanceMinutes = workedMinutes - expectedMinutes,
                Status = "COMPLETE",
                CreatedAt = DateTime.UtcNow
            };
            _db.TimeDailySummaries.Add(summary);
        }
        else
        {
            summary.WorkedMinutes = workedMinutes;
            summary.BalanceMinutes = workedMinutes - expectedMinutes;
            summary.UpdatedAt = DateTime.UtcNow;
        }
        
        await _db.SaveChangesAsync();
    }
}

/*
Ejemplo cálculo:
- Fichaje entrada: 09:00 (TimeEntry IN)
- Fichaje salida: 18:00 (TimeEntry OUT)
- Descanso: 60 minutos
- Minutos brutos: 18:00 - 09:00 = 540 minutos
- Minutos netos: 540 - 60 = 480 minutos (8 horas trabajadas)
- Esperado horario: 480 minutos
- Balance: 480 - 480 = 0 (Perfecto, sin horas extras ni falta)
*/
```

---

# 📱 APPLICATION LAYER - Servicios de Negocio

Los servicios de aplicación contienen la lógica de negocio. Ubicación: `SistemaFichajesVacaciones.Application/Services/`

## VacationBalanceService (Gestión de Saldos)

```csharp
public interface IVacationBalanceService
{
    Task<VacationBalance> GetBalanceAsync(int employeeId, int year);
    Task RecalculateBalanceAsync(int employeeId, int year);
    Task DeductVacationDaysAsync(int employeeId, int days, int year);
}

public class VacationBalanceService : IVacationBalanceService
{
    private readonly AppDbContext _db;
    
    public async Task<VacationBalance> GetBalanceAsync(int employeeId, int year)
    {
        var balance = await _db.VacationBalances
            .FirstOrDefaultAsync(vb => vb.EmployeeId == employeeId && vb.Year == year);
        
        if (balance == null)
        {
            // Crear nuevo balance si no existe
            var defaultDays = 30; // Convención default
            balance = new VacationBalance
            {
                EmployeeId = employeeId,
                Year = year,
                InitialDays = defaultDays,
                UsedDays = 0,
                RemainingDays = defaultDays,
                UpdatedAt = DateTime.UtcNow
            };
            _db.VacationBalances.Add(balance);
            await _db.SaveChangesAsync();
        }
        
        return balance;
    }
    
    public async Task DeductVacationDaysAsync(int employeeId, int days, int year)
    {
        var balance = await GetBalanceAsync(employeeId, year);
        
        if (balance.RemainingDays < days)
            throw new InvalidOperationException("No hay suficientes días de vacaciones");
        
        balance.UsedDays += days;
        balance.RemainingDays = balance.InitialDays - balance.UsedDays;
        balance.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
    }
}

/*
Flujo:
1. Empleado tiene 30 días iniciales (InitialDays = 30)
2. Solicita 5 días de vacaciones
3. UsedDays pasa a 5
4. RemainingDays = 30 - 5 = 25 días restantes
5. Si intenta solicitar 26 días → Error
*/
```

## VacationRequestService (Solicitudes)

```csharp
public interface IVacationRequestService
{
    Task<VacationRequest> CreateRequestAsync(int employeeId, DateTime startDate, 
                                             DateTime endDate, string reason);
    Task<VacationRequest> ApproveAsync(int requestId, int approverId);
    Task<VacationRequest> RejectAsync(int requestId, string reason);
    Task<List<VacationRequest>> GetPendingRequestsAsync(int managerId);
}

public class VacationRequestService : IVacationRequestService
{
    private readonly AppDbContext _db;
    private readonly IVacationBalanceService _balanceService;
    
    public async Task<VacationRequest> CreateRequestAsync(int employeeId, DateTime startDate,
                                                          DateTime endDate, string reason)
    {
        // Validar fechas
        if (startDate > endDate)
            throw new ArgumentException("Fecha inicio no puede ser posterior a fin");
        
        // Calcular días solicitados (excluyendo fines de semana/festivos)
        var daysRequested = CalculateWorkingDays(startDate, endDate);
        
        // Validar saldo disponible
        var balance = await _balanceService.GetBalanceAsync(employeeId, startDate.Year);
        if (balance.RemainingDays < daysRequested)
            throw new InvalidOperationException("No hay suficientes días de vacaciones");
        
        var request = new VacationRequest
        {
            EmployeeId = employeeId,
            StartDate = startDate,
            EndDate = endDate,
            DaysRequested = daysRequested,
            Reason = reason,
            Status = "DRAFT",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _db.VacationRequests.Add(request);
        await _db.SaveChangesAsync();
        
        return request;
    }
    
    public async Task<VacationRequest> ApproveAsync(int requestId, int approverId)
    {
        var request = await _db.VacationRequests.FindAsync(requestId);
        if (request == null)
            throw new KeyNotFoundException("Solicitud no encontrada");
        
        // Deducir días del balance
        await _balanceService.DeductVacationDaysAsync(request.EmployeeId, 
                                                      request.DaysRequested, 
                                                      request.StartDate.Year);
        
        request.Status = "APPROVED";
        request.ApproverEmployeeId = approverId;
        request.ApprovedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        return request;
    }
    
    private int CalculateWorkingDays(DateTime start, DateTime end)
    {
        int days = 0;
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            // No contar fines de semana
            if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
                days++;
        }
        return days;
    }
}

/*
Flujo completo:
1. Empleado crea solicitud: 20-24 marzo (5 días laborales)
2. Status = "DRAFT"
3. Empleado envía (SUBMITTED)
4. Manager revisa y aprueba
5. Status = "APPROVED"
6. Balance: UsedDays += 5, RemainingDays -=5
7. Las fechas entran en "vacaciones" automáticamente
*/
```

---

# 🌐 API LAYER - Controllers

Los controllers manejan las peticiones HTTP. Ubicación: `SistemaFichajesVacaciones.Api/Controllers/`

## AuthController (Autenticación)

```csharp
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    
    /// <summary>
    /// POST /api/auth/login
    /// Autentica un usuario y devuelve JWT token
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Buscar usuario por email
        var user = await _db.Users
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Email == request.Email);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Credenciales inválidas" });
        
        // Generar JWT
        var token = _tokenService.GenerateToken(user);
        
        return Ok(new
        {
            token,
            user = new
            {
                userId = user.UserId,
                employeeId = user.EmployeeId,
                email = user.Email,
                role = user.Role,
                fullName = user.Employee.FullName
            }
        });
    }
    
    /// <summary>
    /// POST /api/auth/logout
    /// Invalida sesión (opcional, JWT es stateless)
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // JWT no requiere logout en servidor
        // Cliente simplemente borra el token del localStorage
        return Ok(new { message = "Sesión cerrada" });
    }
}

/*
Flujo Login:
1. Cliente envía: { "email": "user@email.com", "password": "abc123" }
2. Server busca user en BD
3. Valida contraseña con BCrypt.Verify()
4. Si OK: Genera JWT con claims (userId, role, etc.)
5. Cliente recibe token y lo guarda en localStorage
6. Próximas requests incluyen: Authorization: Bearer <token>
7. Server valida token en cada request con middleware
*/
```

## TimeEntriesController (Fichajes) - ✅ REFACTORIZADO

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimeEntriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmployeeAuthorizationService _authService;  // 🆕
    private readonly ITimeSummaryService _timeSummaryService;
    
    /// <summary>
    /// GET /api/timeentries/entries/{employeeId}
    /// Obtiene fichajes de un empleado
    /// SEGURIDAD: Solo manager del employee o el employee mismo
    /// </summary>
    [HttpGet("entries/{employeeId}")]
    public async Task<IActionResult> GetEntries(int employeeId, [FromQuery] DateTime? startDate, 
                                                 [FromQuery] DateTime? endDate)
    {
        var currentUserId = GetCurrentUserId();
        var currentEmployeeId = GetCurrentEmployeeId();
        
        // ✅ ANTES (duplicado en 7 controllers):
        // var isManager = await _db.Employees
        //     .AnyAsync(e => e.EmployeeId == employeeId && e.ManagerEmployeeId == currentEmployeeId);
        // if (currentEmployeeId != employeeId && !isManager && !IsAdmin())
        //     return Forbid();
        
        // ✅ AHORA (centralizado):
        var isAuthorized = await _authService.IsManagerOfEmployeeAsync(currentEmployeeId, employeeId)
            || currentEmployeeId == employeeId || IsAdmin();
        if (!isAuthorized)
            return Forbid();
        
        var query = _db.TimeEntries
            .Where(te => te.EmployeeId == employeeId);
        
        if (startDate.HasValue)
            query = query.Where(te => te.Time >= startDate);
        if (endDate.HasValue)
            query = query.Where(te => te.Time <= endDate);
        
        var entries = await query
            .OrderBy(te => te.Time)
            .ToListAsync();
        
        return Ok(entries);
    }
    
    /// <summary>
    /// POST /api/timeentries/checkin
    /// Registra entrada (9:00 AM)
    /// </summary>
    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn()
    {
        var employeeId = GetCurrentEmployeeId();
        
        var entry = new TimeEntry
        {
            EmployeeId = employeeId,
            Time = DateTime.UtcNow,
            EntryType = "IN",
            Source = "APP",
            CreatedAt = DateTime.UtcNow
        };
        
        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();
        
        // Recalcular resumen del día
        await _timeSummaryService.CalculateDailySummaryAsync(employeeId, DateTime.UtcNow);
        
        return Ok(new { message = "Entrada registrada", entry });
    }
    
    /// <summary>
    /// POST /api/timeentries/checkout
    /// Registra salida (18:00 PM)
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> CheckOut()
    {
        var employeeId = GetCurrentEmployeeId();
        
        var entry = new TimeEntry
        {
            EmployeeId = employeeId,
            Time = DateTime.UtcNow,
            EntryType = "OUT",
            Source = "APP",
            CreatedAt = DateTime.UtcNow
        };
        
        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();
        
        await _timeSummaryService.CalculateDailySummaryAsync(employeeId, DateTime.UtcNow);
        
        return Ok(new { message = "Salida registrada", entry });
    }
    
    /// <summary>
    /// GET /api/timeentries/daily-summary/{employeeId}
    /// Obtiene resumen del día para un empleado
    /// </summary>
    [HttpGet("daily-summary/{employeeId}")]
    public async Task<IActionResult> GetDailySummary(int employeeId, [FromQuery] DateTime? date)
    {
        date ??= DateTime.UtcNow;
        
        // ✅ AUTORIZACIÓN CENTRALIZADA
        var isAuthorized = await _authService.IsManagerOfEmployeeAsync(GetCurrentEmployeeId(), employeeId)
            || GetCurrentEmployeeId() == employeeId || IsAdmin();
        if (!isAuthorized)
            return Forbid();
        
        var summary = await _db.TimeDailySummaries
            .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.Date == date.Value.Date);
        
        if (summary == null)
            return NotFound(new { message = "No hay resumen para este día" });
        
        return Ok(summary);
    }
    
    private int GetCurrentEmployeeId() => int.Parse(User.FindFirst("employee_id")?.Value ?? "0");
    private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private bool IsAdmin() => User.FindFirst(ClaimTypes.Role)?.Value == "ADMIN";
}

/*
Endpoints disponibles:

POST /api/timeentries/checkin
  → Registra entrada manual
  → Body: vacío (usa DateTime.UtcNow)
  
POST /api/timeentries/checkout
  → Registra salida manual
  → Body: vacío

GET /api/timeentries/entries/{employeeId}?startDate=2024-03-01&endDate=2024-03-31
  → Devuelve fichajes del período
  → Respuesta: Array<{TimeEntryId, EmployeeId, Time, EntryType, Source}>

GET /api/timeentries/daily-summary/{employeeId}?date=2024-03-19
  → Devuelve resumen del día
  → Respuesta: {DailySummaryId, EmployeeId, Date, ExpectedMinutes, WorkedMinutes, BalanceMinutes}

SEGURIDAD:
- ADMIN → Ve todos los datos
- MANAGER → Ve datos de subordinados directos
- EMPLOYEE → Solo sus propios datos
- Si intenta acceder a datos sin permisos → 403 Forbid
*/
```

## EmployeesController - ✅ REFACTORIZADO

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmployeeAuthorizationService _authService;  // 🆕
    
    /// <summary>
    /// GET /api/employees
    /// Obtiene lista de empleados accesibles
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetEmployees()
    {
        var currentEmployeeId = GetCurrentEmployeeId();
        var role = GetCurrentRole();
        
        IQueryable<Employee> query = _db.Employees.AsQueryable();
        
        // Filtrar según rol
        if (role == "MANAGER")
        {
            // ✅ ANTES: query = query.Where(e => e.ManagerEmployeeId == currentEmployeeId);
            // ✅ AHORA: Usar servicio centralizado
            var subordinateIds = await _authService.GetManagerSubordinateIdsAsync(currentEmployeeId);
            query = query.Where(e => subordinateIds.Contains(e.EmployeeId));
        }
        else if (role == "EMPLOYEE")
        {
            // Employee solo ve sus propios datos
            query = query.Where(e => e.EmployeeId == currentEmployeeId);
        }
        // ADMIN ve todos
        
        var employees = await query.ToListAsync();
        return Ok(employees);
    }
    
    /// <summary>
    /// GET /api/employees/{employeeId}
    /// Obtiene detalles de un empleado específico
    /// </summary>
    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetEmployee(int employeeId)
    {
        var currentEmployeeId = GetCurrentEmployeeId();
        
        // ✅ AUTORIZACIÓN CENTRALIZADA
        var isAuthorized = await _authService.IsManagerOfEmployeeAsync(currentEmployeeId, employeeId)
            || currentEmployeeId == employeeId || IsAdmin();
        if (!isAuthorized)
            return Forbid();
        
        var employee = await _db.Employees
            .Include(e => e.Manager)
            .Include(e => e.WorkSchedules)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
        
        if (employee == null)
            return NotFound();
        
        return Ok(employee);
    }
    
    /// <summary>
    /// PUT /api/employees/{employeeId}
    /// Actualiza datos del empleado
    /// Solo ADMIN o el empleado mismo
    /// </summary>
    [HttpPut("{employeeId}")]
    public async Task<IActionResult> UpdateEmployee(int employeeId, [FromBody] UpdateEmployeeRequest request)
    {
        var currentEmployeeId = GetCurrentEmployeeId();
        var role = GetCurrentRole();
        
        // Solo admin o el mismo empleado
        if (role != "ADMIN" && currentEmployeeId != employeeId)
            return Forbid();
        
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
            return NotFound();
        
        employee.FullName = request.FullName ?? employee.FullName;
        employee.Email = request.Email ?? employee.Email;
        employee.Department = request.Department ?? employee.Department;
        employee.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        
        return Ok(employee);
    }
    
    private int GetCurrentEmployeeId() => int.Parse(User.FindFirst("employee_id")?.Value ?? "0");
    private string GetCurrentRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "EMPLOYEE";
    private bool IsAdmin() => GetCurrentRole() == "ADMIN";
}

/*
Endpoints disponibles:

GET /api/employees
  Filters automáticos por rol:
  - ADMIN: Ve todos
  - MANAGER: Ve solo subordinados
  - EMPLOYEE: Ve solo si mismo
  
GET /api/employees/{employeeId}
  Devuelve: {EmployeeId, FullName, Email, Department, Position, Manager, WorkSchedules[]}

PUT /api/employees/{employeeId}
  Body: { "fullName": "Nuevo Nombre", "email": "nuevo@mail.com", ... }
  Solo ADMIN o el same employee
*/
```

## VacationRequestsController - ✅ REFACTORIZADO

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VacationRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IVacationRequestService _vacationService;
    private readonly IEmployeeAuthorizationService _authService;  // 🆕
    
    /// <summary>
    /// POST /api/vacationrequests
    /// Crea nueva solicitud de vacaciones
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateVacationRequestDto dto)
    {
        var employeeId = GetCurrentEmployeeId();
        
        var request = await _vacationService.CreateRequestAsync(
            employeeId, dto.StartDate, dto.EndDate, dto.Reason);
        
        return CreatedAtAction(nameof(GetRequest), new { id = request.RequestId }, request);
    }
    
    /// <summary>
    /// GET /api/vacationrequests/pending
    /// Obtiene vacaciones pendientes de aprobación para manager
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var managerId = GetCurrentEmployeeId();
        
        // ✅ ANTES: Obtener subordinados con LINQ duplicado
        // ✅ AHORA: Usar servicio centralizado
        var subordinateIds = await _authService.GetManagerSubordinateIdsAsync(managerId);
        
        var requests = await _db.VacationRequests
            .Where(vr => subordinateIds.Contains(vr.EmployeeId) && vr.Status == "SUBMITTED")
            .Include(vr => vr.Employee)
            .OrderByDescending(vr => vr.CreatedAt)
            .ToListAsync();
        
        return Ok(requests);
    }
    
    /// <summary>
    /// PUT /api/vacationrequests/{requestId}/approve
    /// Aprueba solicitud de vacaciones
    /// </summary>
    [HttpPut("{requestId}/approve")]
    public async Task<IActionResult> ApproveRequest(int requestId)
    {
        var managerId = GetCurrentEmployeeId();
        
        var request = await _db.VacationRequests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        // ✅ ANTES: Validación manual duplicada
        // ✅ AHORA: Usar servicio centralizado
        var isManager = await _authService.IsManagerOfEmployeeAsync(managerId, request.EmployeeId);
        if (!isManager && !IsAdmin())
            return Forbid();
        
        var result = await _vacationService.ApproveAsync(requestId, managerId);
        return Ok(result);
    }
    
    /// <summary>
    /// PUT /api/vacationrequests/{requestId}/reject
    /// Rechaza solicitud de vacaciones
    /// </summary>
    [HttpPut("{requestId}/reject")]
    public async Task<IActionResult> RejectRequest(int requestId, [FromBody] RejectRequestDto dto)
    {
        var managerId = GetCurrentEmployeeId();
        
        var request = await _db.VacationRequests.FindAsync(requestId);
        if (request == null)
            return NotFound();
        
        var isManager = await _authService.IsManagerOfEmployeeAsync(managerId, request.EmployeeId);
        if (!isManager && !IsAdmin())
            return Forbid();
        
        var result = await _vacationService.RejectAsync(requestId, dto.Reason);
        return Ok(result);
    }
    
    private int GetCurrentEmployeeId() => int.Parse(User.FindFirst("employee_id")?.Value ?? "0");
    private bool IsAdmin() => User.FindFirst(ClaimTypes.Role)?.Value == "ADMIN";
}

/*
Endpoints disponibles:

POST /api/vacationrequests
  Body: { "startDate": "2024-04-01", "endDate": "2024-04-05", "reason": "Vacaciones" }
  → Crea solicitud con Status = "DRAFT"

GET /api/vacationrequests/pending
  → Devuelve vacaciones pendientes de aprobar del manager
  → Solo acesible para MANAGER y ADMIN

PUT /api/vacationrequests/{requestId}/approve
  → Aprueba y deduce días del balance
  → Solo para manager del empleado

PUT /api/vacationrequests/{requestId}/reject
  Body: { "reason": "Motivo del rechazo" }
  → Rechaza solicitud
*/
```

---

# ⚛️ FRONTEND REACT

## Estructura de Carpetas

```
frontendReact/src/
├── App.jsx                 ← Componente raíz
├── main.jsx                ← Entry point (con React + i18n)
├── index.css               ← Estilos globales
│
├── components/             ← Componentes reutilizables
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Layout.jsx      ← Wrapper principal
│   │   └── ProtectedRoute.jsx
│   ├── ui/
│   │   ├── Dialog.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── Snackbar.jsx
│   │   └── LoadingSpinner.jsx
│   └── forms/
│       ├── DateField.jsx
│       └── TimeField.jsx
│
├── modules/               ← Por funcionalidad
│   ├── admin/            ← Administración
│   │   ├── tabs/
│   │   │   ├── SchedulesTab.jsx ✅
│   │   │   │   └── schedules/
│   │   │   │       ├── components/
│   │   │   │       │   ├── EmployeeSelector.jsx ✅
│   │   │   │       │   ├── ScheduleGrid.jsx ✅
│   │   │   │       │   └── ScheduleForm.jsx ✅
│   │   │   │       └── services/ (si las necesita)
│   │   │   ├── EmployeesTab.jsx
│   │   │   ├── ImportTab.jsx
│   │   │   └── PoliciesTab.jsx
│   │   └── AdminPage.jsx
│   │
│   ├── time/            ← Fichajes
│   │   ├── clock/
│   │   │   └── Timeclockpage.jsx
│   │   ├── history/
│   │   │   └── History.jsx
│   │   ├── corrections/
│   │   │   ├── Corrections.jsx
│   │   │   └── components/
│   │   │       ├── CorrectionsList.jsx
│   │   │       └── CorrectionForm.jsx
│   │   └── TimeModule.jsx
│   │
│   ├── vacations/       ← Vacaciones
│   │   ├── requests/
│   │   │   └── VacationRequests.jsx
│   │   ├── approvals/
│   │   │   └── VacationApprovals.jsx
│   │   ├── calendar/
│   │   │   └── VacationCalendar.jsx
│   │   └── VacationsModule.jsx
│   │
│   ├── dashboard/       ← Inicio
│   │   ├── Dashboard.jsx
│   │   └── components/
│   │       ├── BalanceCard.jsx
│   │       ├── RecentTimeChart.jsx
│   │       └── UpcomingVacations.jsx
│   │
│   ├── employees/
│   │   ├── detail/
│   │   │   └── Employees.jsx
│   │   └── EmployeesModule.jsx
│   │
│   └── settings/
│       └── SettingsPage.jsx
│
├── pages/               ← Páginas principales
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   └── NotFoundPage.jsx
│
├── services/            ← Clientes HTTP
│   ├── api.js           ← Instancia Axios
│   ├── authService.js
│   ├── timeService.js
│   ├── employeesService.js
│   ├── vacationsService.js
│   ├── schedulesService.js
│   └── correctionsService.js
│
├── hooks/               ← Custom Hooks
│   ├── useScheduleManager.js ✅
│   ├── useSnackbar.js
│   ├── useFetch.js
│   ├── useRole.js
│   ├── useVacations.js
│   └── [más hooks]
│
├── context/             ← Context API
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── LanguageContext.jsx
│
├── i18n/                ← Internacionalización
│   ├── i18n.js
│   └── locales/
│       ├── es.json
│       └── en.json
│
├── utils/
│   ├── helpers/
│   │   ├── dateUtils.js
│   │   ├── roleUtils.js
│   │   └── validations.js
│   └── validators/
│       └── [validadores]
│
├── styles/
│   ├── theme.js         ← Tema MUI
│   └── globalStyles.js
│
└── assets/
    ├── images/
    ├── icons/
    └── logos/
```

## Hook: useScheduleManager ✅ (Refactorizado)

```javascript
import { useState, useEffect } from 'react';
import { employeesService } from '../services/employeesService';
import { schedulesService } from '../services/schedulesService';

/**
 * Hook centralizado para gestión de horarios
 * Encapsula toda la lógica de CRUD
 * 
 * @param {Function} showSnack - Función para mostrar notificaciones
 * @returns {Object} Estado y manejadores
 */
export const useScheduleManager = (showSnack) => {
  // ============ ESTADO ============
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [schedules, setSchedules] = useState([]);
  
  // Flags de carga
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [loadingSch, setLoadingSch] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estado del diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  
  // Datos del formulario
  const [form, setForm] = useState({
    validFrom: new Date(),
    validTo: null,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    notes: ''
  });
  
  // ============ EFECTOS ============
  
  /**
   * Al cargar, obtener lista de empleados
   */
  useEffect(() => {
    loadEmployees();
  }, []);
  
  /**
   * Cuando cambia empleado seleccionado, cargar sus horarios
   */
  useEffect(() => {
    if (selectedEmp) {
      loadSchedules();
    }
  }, [selectedEmp]);
  
  // ============ MANEJADORES ============
  
  const loadEmployees = async () => {
    setLoadingEmp(true);
    try {
      const data = await employeesService.getEmployees();
      setEmployees(data);
    } catch (error) {
      showSnack(`Error al cargar empleados: ${error.message}`, 'error');
    } finally {
      setLoadingEmp(false);
    }
  };
  
  const loadSchedules = async () => {
    if (!selectedEmp) return;
    
    setLoadingSch(true);
    try {
      const data = await schedulesService.getSchedules(selectedEmp.EmployeeId);
      setSchedules(data);
    } catch (error) {
      showSnack(`Error al cargar horarios: ${error.message}`, 'error');
    } finally {
      setLoadingSch(false);
    }
  };
  
  const openCreate = () => {
    setEditing(null);
    setForm({
      validFrom: new Date(),
      validTo: null,
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      notes: ''
    });
    setDialogOpen(true);
  };
  
  const openEdit = (schedule) => {
    setEditing(schedule);
    setForm({
      validFrom: new Date(schedule.validFrom),
      validTo: schedule.validTo ? new Date(schedule.validTo) : null,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakMinutes: schedule.breakMinutes,
      notes: schedule.notes || ''
    });
    setDialogOpen(true);
  };
  
  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };
  
  const handleFormChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = async () => {
    if (!selectedEmp) {
      showSnack('Selecciona un empleado', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        employeeId: selectedEmp.EmployeeId,
        ...form
      };
      
      if (editing) {
        await schedulesService.updateSchedule(editing.WorkScheduleId, payload);
        showSnack('Horario actualizado', 'success');
      } else {
        await schedulesService.createSchedule(payload);
        showSnack('Horario creado', 'success');
      }
      
      closeDialog();
      await loadSchedules();
    } catch (error) {
      showSnack(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (scheduleId) => {
    setSaving(true);
    try {
      await schedulesService.deleteSchedule(scheduleId);
      showSnack('Horario eliminado', 'success');
      await loadSchedules();
    } catch (error) {
      showSnack(`Error al eliminar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // ============ RETORNO ============
  return {
    // Estado
    employees,
    selectedEmp,
    schedules,
    dialogOpen,
    editing,
    form,
    loadingEmp,
    loadingSch,
    saving,
    
    // Manejadores
    setSelectedEmp,
    openCreate,
    openEdit,
    closeDialog,
    handleFormChange,
    handleSave,
    handleDelete
  };
};

/*
Uso en SchedulesTab.jsx:

const SchedulesTab = () => {
  const { t } = useTranslation();
  const { showSnack } = useSnackbar();
  const manager = useScheduleManager(showSnack);
  
  return (
    <Box>
      <EmployeeSelector
        employees={manager.employees}
        selectedEmp={manager.selectedEmp}
        onChange={manager.setSelectedEmp}
        loading={manager.loadingEmp}
      />
      
      <ScheduleGrid
        schedules={manager.schedules}
        loading={manager.loadingSch}
        onAdd={manager.openCreate}
        onEdit={manager.openEdit}
        onDelete={manager.handleDelete}
      />
      
      <ScheduleForm
        open={manager.dialogOpen}
        editing={manager.editing}
        form={manager.form}
        saving={manager.saving}
        onFormChange={manager.handleFormChange}
        onSave={manager.handleSave}
        onClose={manager.closeDialog}
      />
    </Box>
  );
};

BENEFICIOS:
✅ Toda la lógica en un lugar
✅ Testeable independientemente
✅ Reutilizable en otros componentes
✅ Separación de concerns
*/
```

## Componente: SchedulesTab ✅ (Refactorizado - 78% más pequeño)

```javascript
import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useScheduleManager } from '../../../hooks/useScheduleManager';
import EmployeeSelector from './schedules/components/EmployeeSelector';
import ScheduleGrid from './schedules/components/ScheduleGrid';
import ScheduleForm from './schedules/components/ScheduleForm';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

/**
 * SchedulesTab - Gestión de horarios de empleados
 * 
 * ARQUITECTURA:
 * 1. EmployeeSelector → Seleccionar empleado
 * 2. ScheduleGrid → Ver y actuar sobre horarios
 * 3. ScheduleForm → Crear/editar horarios
 * 
 * Toda la lógica está en useScheduleManager (hook)
 * Este componente solo orquesta (78% más pequeño después de refactorizar)
 */
const SchedulesTab = () => {
  const { t } = useTranslation();
  const { showSnack } = useSnackbar();
  const manager = useScheduleManager(showSnack);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [scheduleToDelete, setScheduleToDelete] = React.useState(null);
  
  const handleDeleteClick = (schedule) => {
    setScheduleToDelete(schedule);
    setDeleteConfirmOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (scheduleToDelete) {
      await manager.handleDelete(scheduleToDelete.WorkScheduleId);
      setDeleteConfirmOpen(false);
      setScheduleToDelete(null);
    }
  };
  
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 1. Selector de Empleado */}
      <EmployeeSelector
        employees={manager.employees}
        selectedEmp={manager.selectedEmp}
        onChange={manager.setSelectedEmp}
        loading={manager.loadingEmp}
      />
      
      {/* 2. Grid de Horarios */}
      {manager.selectedEmp && (
        <ScheduleGrid
          schedules={manager.schedules}
          loading={manager.loadingSch}
          onAdd={manager.openCreate}
          onEdit={manager.openEdit}
          onDelete={handleDeleteClick}
        />
      )}
      
      {/* 3. Formulario Crear/Editar */}
      <ScheduleForm
        open={manager.dialogOpen}
        editing={manager.editing}
        form={manager.form}
        saving={manager.saving}
        onFormChange={manager.handleFormChange}
        onSave={manager.handleSave}
        onClose={manager.closeDialog}
      />
      
      {/* 4. Diálogo Confirmación */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('Confirmar eliminación')}
        message={t('¿Estás seguro de que deseas eliminar este horario?')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};

export default SchedulesTab;

/*
ANTES (333 líneas):
- Estado mezclado con UI
- Lógica de CRUD duplicada
- Difícil de testear
- Difícil de entender

DESPUÉS (72 líneas):
- Componente limpio y legible
- Toda lógica en useScheduleManager
- Componentes pequeños y reutilizables
- Fácil de testear

LINEAS ELIMINADAS:
✅ -261 líneas (78% reducción)
*/
```

## Componente: ScheduleGrid (Nuevo)

```javascript
import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toLocalDate } from '../../../utils/helpers/dateUtils';

const ScheduleGrid = ({ schedules, loading, onAdd, onEdit, onDelete }) => {
  const { t } = useTranslation();
  
  const columns = [
    {
      field: 'validFrom',
      headerName: t('Válido desde'),
      width: 120,
      valueFormatter: (value) => toLocalDate(value)
    },
    {
      field: 'validTo',
      headerName: t('Válido hasta'),
      width: 120,
      valueFormatter: (value) => value ? toLocalDate(value) : '-'
    },
    {
      field: 'startTime',
      headerName: t('Inicio'),
      width: 100
    },
    {
      field: 'endTime',
      headerName: t('Fin'),
      width: 100
    },
    {
      field: 'breakMinutes',
      headerName: t('Descanso (min)'),
      width: 120
    },
    {
      field: 'notes',
      headerName: t('Notas'),
      flex: 1,
      maxWidth: 300
    },
    {
      field: 'actions',
      headerName: t('Acciones'),
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('Editar')}>
            <IconButton
              size="small"
              onClick={() => onEdit(params.row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Eliminar')}>
            <IconButton
              size="small"
              onClick={() => onDelete(params.row)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];
  
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <h3>{t('Horarios')}</h3>
        <Tooltip title={t('Crear nuevo horario')}>
          <IconButton color="primary" onClick={onAdd}>
            <Add />
          </IconButton>
        </Tooltip>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={schedules}
          columns={columns}
          getRowId={(row) => row.WorkScheduleId}
          autoHeight
          pageSizeOptions={[5, 10, 25]}
          disableSelectionOnClick
        />
      )}
    </Box>
  );
};

export default ScheduleGrid;
```

---

# 🔄 FLUJOS DE NEGOCIO

## Flujo 1: Autenticación y Sesión

```
┌─────────────────────────────────────────────────────────┐
│        FLUJO: USUARIO INICIA SESIÓN                     │
└─────────────────────────────────────────────────────────┘

1. USUARIO INGRESA CREDENCIALES
   └─→ LoginPage.jsx
       ├─ Email: user@company.com
       └─ Password: ****

2. ENVÍA POST a /api/auth/login
   └─→ AuthController.Login()
       ├─ Busca usuario en BD por email
       ├─ Compara contraseña con BCrypt
       └─ Si no coincide → 401 Unauthorized

3. GENERA JWT TOKEN
   └─→ TokenService.GenerateToken()
       ├─ Claims: userId, employeeId, email, role
       ├─ Firma con algoritmo HS256
       └─ Válido por 24 horas

4. SERVIDOR DEVUELVE
   {
     "token": "eyJhbGc...",
     "user": {
       "userId": 1,
       "employeeId": 100,
       "email": "user@company.com",
       "role": "MANAGER",
       "fullName": "Juan García"
     }
   }

5. CLIENTE GUARDA TOKEN
   └─→ localStorage.setItem("token", "eyJhbGc...")
   └─→ AuthContext actualiza estado global

6. TOKEN SE INCLUYE EN PRÓXIMAS REQUESTS
   └─→ Authorization: Bearer eyJhbGc...

7. MIDDLEWARE VALIDA TOKEN
   └─→ Middleware.Authenticate()
       ├─ Verifica firma JWT
       ├─ Extrae claims
       └─ Si inválido → 401

8. USUARIO ACCEDE SISTEMA
   └─→ Redirige a Dashboard
   └─→ Se carga según rol (ADMIN/MANAGER/EMPLOYEE)
```

## Flujo 2: Registrar Fichaje (Check-In/Out)

```
┌─────────────────────────────────────────────────────────┐
│    FLUJO: EMPLEADO FICHA ENTRADA/SALIDA                │
└─────────────────────────────────────────────────────────┘

MAÑANA (09:00) - CHECK IN
├─ 1. Usuario abre app → Timeclockpage.jsx
├─ 2. Click en "FICHAR ENTRADA"
├─ 3. POST /api/timeentries/checkin
│   └─→ TimeEntriesController.CheckIn()
│       ├─ Crea TimeEntry:
│       │  ├─ EmployeeId: 100
│       │  ├─ Time: 2024-03-19 09:00
│       │  ├─ EntryType: "IN"
│       │  ├─ Source: "APP"
│       │  └─ CreatedAt: ahora
│       └─ Guarda en BD
│
├─ 4. Llama TimeSummaryService.CalculateDailySummaryAsync()
│   ├─ Busca fichajes de hoy
│   ├─ Como solo existe IN, no calcula balance aún
│   └─ Espera OUT
│
├─ 5. Respuesta OK
│   └─→ Snackbar: "✓ Entrada registrada a las 09:00"

TARDE (18:00) - CHECK OUT
├─ 1. Usuario click "FICHAR SALIDA"
├─ 2. POST /api/timeentries/checkout
│   └─→ Crea TimeEntry OUT
│
├─ 3. TimeSummaryService.CalculateDailySummaryAsync()
│   ├─ Busca fichajes: [IN 09:00, OUT 18:00]
│   ├─ Calcula:
│   │  └─ Tiempo bruto: 18:00 - 09:00 = 9 hours
│   │  └─ Descanso: -60 min
│   │  └─ Tiempo neto: 8 horas = 480 minutos
│   ├─ Obtiene horario del día: 480 min esperados
│   ├─ Balance: 480 - 480 = 0 (perfecto)
│   └─ Crea/actualiza TimeDailySummary:
│       {
│         "EmployeeId": 100,
│         "Date": 2024-03-19,
│         "ExpectedMinutes": 480,
│         "WorkedMinutes": 480,
│         "BalanceMinutes": 0,
│         "Status": "COMPLETE"
│       }
│
├─ 4. Respuesta OK
│   └─→ Snackbar: "✓ Salida registrada a las 18:00"

BD (TimeEntry tabla):
┌─────────────────────────────────────┐
│ TimeEntryId │ EmployeeId │ Time    │
├─────────────────────────────────────┤
│ 5001        │ 100        │ 09:00   │ ← IN
│ 5002        │ 100        │ 18:00   │ ← OUT
└─────────────────────────────────────┘

BD (TimeDailySummary tabla):
┌────────────────────────────────────────────┐
│ EmployeeId │ Date  │ Worked │ Expected    │
├────────────────────────────────────────────┤
│ 100        │ 19/3  │ 480    │ 480 → ✓ OK │
└────────────────────────────────────────────┘
```

## Flujo 3: Solicitar Corrección de Tiempo

```
┌───────────────────────────────────────────────────────┐
│  FLUJO: EMPLEADO SOLICITA CORRECCIÓN (olvidó fichar) │
└───────────────────────────────────────────────────────┘

EMPLEADO NOTA ERROR
├─ Día 18/3: Fichó 08:30-17:30 (debió ser 09:00-18:00)
├─ Perdió 30 min debidos a olvido del sistema
├─ Abre Corrections.jsx

CREA SOLICITUD
├─ 1. Click "Nueva Corrección"
├─ 2. Completa formulario:
│   ├─ Fecha: 18/3/2024
│   ├─ Minutos: +30 (ahora debe 30 min)
│   ├─ Motivo: "Sistema no registró entrada"
│   └─ Click "Enviar"
│
├─ 3. POST /api/timecorrections
│   └─→ TimeCorrectionsController.Create()
│       ├─ Validaciones
│       ├─ Crea TimeCorrection con Status = "PENDING":
│       │  {
│       │    "CorrectionId": 2001,
│       │    "EmployeeId": 100,
│       │    "Date": 2024-03-18,
│       │    "Minutes": 30,
│       │    "Reason": "Sistema no registró entrada",
│       │    "Status": "PENDING",
│       │    "ApprovedByUserId": null,
│       │    "CreatedAt": 2024-03-19 14:00
│       │  }
│       └─ Notifica al manager

MANAGER REVISA
├─ 1. Abre Approvals tab
├─ 2. Ve correcciones pendientes de empleados:
│   └─ Juan García: +30 min (18/3)
│
├─ 3. Hace click "Ver detalles"
│   └─ Ve: Motivo, fecha, minutos, evidencia

MANAGER APRUEBA O RECHAZA
├─ Opción A: APRUEBA
│   ├─ 1. PUT /api/timecorrections/{id}/approve
│   ├─ 2. TimeCorrectionsController.Approve()
│   │   ├─ Valida que sea manager del empleado ✅
│   │   ├─ Status = "APPROVED"
│   │   ├─ ApprovedByUserId = 50 (manager ID)
│   │   ├─ ApprovedAt = ahora
│   │   └─ Guarda BD
│   │
│   ├─ 3. TimeSummaryService.RecalculateDailySummary()
│   │   ├─ Obtiene TimeDailySummary de 18/3
│   │   ├─ Suma +30 minutos
│   │   ├─ Nuevo Balance: 480 - 480 + 30 = +30 min
│   │   └─ Guarda cambio
│   │
│   └─ 4. Notificar empleado:
│       └─→ "✓ Corrección aprobada: +30 minutos"
│
├─ Opción B: RECHAZA
│   ├─ 1. PUT /api/timecorrections/{id}/reject
│   │   Body: { "reason": "Sin pruebas" }
│   ├─ 2. Status = "REJECTED"
│   ├─ 3. RejectionReason = "Sin pruebas"
│   └─ 4. NO se modifican totales

RESULTADO FINAL (si aprobada)
├─ TimeDailySummary actualizado:
│  {
│    "Date": 2024-03-18,
│    "ExpectedMinutes": 480,
│    "WorkedMinutes": 480,
│    "BalanceMinutes": 30 ← Ahora tiene exceso
│  }
│
├─ Empleado puede compensar estos 30 min:
│  └─ Saliendo 30 min antes otro día
│  └─ O acumulándolo para banco de horas
```

## Flujo 4: Solicitar Vacaciones

```
┌────────────────────────────────────────────────────┐
│       FLUJO: SOLICITUD DE VACACIONES               │
└────────────────────────────────────────────────────┘

PASO 1: VERIFICAR SALDO DISPONIBLE
├─ VacationBalanceService.GetBalance(2024)
├─ Devuelve:
│  {
│    "InitialDays": 30,
│    "UsedDays": 10,
│    "RemainingDays": 20
│  }
├─ ✓ Empleado tiene 20 días disponibles

PASO 2: CREAR SOLICITUD
├─ Empleado abre VacationRequests.jsx
├─ Completa formulario:
│  ├─ Desde: 1 de abril
│  ├─ Hasta: 5 de abril
│  ├─ (Cálculo: 5 días laborales)
│  └─ Motivo: "Vacaciones de primavera"
│
├─ POST /api/vacationrequests
│   └─→ VacationRequestService.CreateRequestAsync()
│       ├─ CalculateWorkingDays(1/4 - 5/4) = 5 días
│       ├─ Valida contra balance: 5 ≤ 20 ✓
│       ├─ Crea VacationRequest:
│       │  {
│       │    "RequestId": 3001,
│       │    "EmployeeId": 100,
│       │    "StartDate": 2024-04-01,
│       │    "EndDate": 2024-04-05,
│       │    "DaysRequested": 5,
│       │    "Status": "DRAFT",
│       │    "CreatedAt": 2024-03-19
│       │  }
│       └─ No deduce días aún (Status = DRAFT)

PASO 3: ENVIAR PARA APROBACIÓN
├─ Empleado: "Enviar solicitud"
├─ PUT /api/vacationrequests/{id}/submit
│   └─ Status: DRAFT → SUBMITTED
│   └─ Notifica al manager

PASO 4: MANAGER APRUEBA
├─ Manager abre VacationApprovals.jsx
├─ Ve: "Juan García solicitó 5 días (1-5 abril)"
│
├─ PUT /api/vacationrequests/{id}/approve
│   └─→ VacationRequestService.ApproveAsync()
│       ├─ Valida que sea manager de empleado ✓
│       ├─ Deduce días del balance:
│       │  ├─ VacationBalanceService.DeductVacationDaysAsync()
│       │  ├─ UsedDays: 10 → 15
│       │  ├─ RemainingDays: 20 → 15
│       │  └─ Guarda cambio BD
│       │
│       ├─ Status: APPROVED
│       ├─ ApprovedAt = ahora
│       ├─ ApproverEmployeeId = 50 (manager)
│       └─ Notifica empleado: "✓ Vacaciones aprobadas"

PASO 5: DÍAS EN VACACIONES
├─ Calendar_Days marca 1-5 abril como "VACATION"
├─ TimeEntry no se espera para esos días
├─ TimeDailySummary marca como "VACATION" (sin balance)

RESULTADO
├─ Balance final:
│  {
│    "InitialDays": 30,
│    "UsedDays": 15,
│    "RemainingDays": 15
│  }
│
├─ Empleado no puede fichar en esos días
├─ Sistema permite vista previa de balance
```

---

# 🛠️ REFACTORIZACIÓN Y OPTIMIZACIONES (IMPLEMENTADAS)

## Refactorización 1: Servicios Centralizados

### Problema Original
```csharp
// ❌ ANTES: Duplicado en TimeEntriesController, EmployeesController, 
//           VacationRequestsController, etc.

[HttpGet("entries/{employeeId}")]
public async Task<IActionResult> GetEntries(int employeeId)
{
    var currentEmployeeId = GetCurrentEmployeeId();
    
    // Validación duplicada #1
    var isManager = await _db.Employees
        .Where(e => e.EmployeeId == employeeId && 
                    e.ManagerEmployeeId == currentEmployeeId)
        .FirstOrDefaultAsync();
    
    if (currentEmployeeId != employeeId && isManager == null && !IsAdmin())
        return Forbid();
    
    // ...resto del código
}
```

### Solución Implementada ✅
```csharp
// ✅ AHORA: Centralizado en IEmployeeAuthorizationService

[HttpGet("entries/{employeeId}")]
public async Task<IActionResult> GetEntries(int employeeId)
{
    var currentEmployeeId = GetCurrentEmployeeId();
    
    // Una línea clara y testeable
    var isAuthorized = await _authService.IsManagerOfEmployeeAsync(currentEmployeeId, employeeId)
        || currentEmployeeId == employeeId || IsAdmin();
    
    if (!isAuthorized)
        return Forbid();
    
    // ...resto del código
}
```

**Beneficios:**
- ➖ -80 líneas código redundante
- ✅ Lógica centralizada en 1 lugar
- ✅ Cambios futuros en 1 archivo
- ✅ Más testeable
- ✅ Aplicada a 7 controllers

## Refactorización 2: Descomposición de Componentes

### Antes (SchedulesTab.jsx - 333 líneas)
```javascript
// ❌ 333 líneas en 1 componente
// - Estado mezclado (employees, schedules, dialog, form)
// - CRUD lógica duplicada
// - UI y lógica mezcladas
// - Difícil testear
// - Difícil de entender

const SchedulesTab = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({...});
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [loadingSch, setLoadingSch] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    // ... lógica carga empleados
  }, []);
  
  useEffect(() => {
    if (selectedEmp) {
      // ... lógica carga horarios
    }
  }, [selectedEmp]);
  
  const handleSave = async () => {
    // ... lógica guardado
  };
  
  const handleDelete = async () => {
    // ... lógica eliminación
  };
  
  return (
    // ... JSX de 100+ líneas
  );
};
```

### Después (Refactorizado - 72 líneas)
```javascript
// ✅ 72 líneas (78% reducción)
// - Lógica separada en useScheduleManager hook
// - UI dividida en 3 componentes especializados
// - Cada componente tiene 1 responsabilidad
// - Fácil de testear
// - Fácil de entender

const SchedulesTab = () => {
  const { t } = useTranslation();
  const { showSnack } = useSnackbar();
  const manager = useScheduleManager(showSnack);  // ← Toda la lógica aquí
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  
  // ...handlers

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <EmployeeSelector {...manager} />    {/* ← Componente */}
      {manager.selectedEmp && <ScheduleGrid {...manager} />}
      <ScheduleForm {...manager} />         {/* ← Componente */}
      <ConfirmDialog {...} />
    </Box>
  );
};
```

**Archivos Nueva**
- `useScheduleManager.js` (115 líneas) - Hook con toda la lógica
- `EmployeeSelector.jsx` (32 líneas) - Selector dropdown
- `ScheduleGrid.jsx` (75 líneas) - Tabla de datos
- `ScheduleForm.jsx` (75 líneas) - Formulario dialog

**Beneficios:**
- ➖ -261 líneas en SchedulesTab.jsx
- ✅ useScheduleManager reutilizable
- ✅ Componentes reutilizables
- ✅ Testeable
- ✅ Mantenible

---

# 📚 RESUMEN FINAL

## Tecnología por Capa

| Capa | Tecnología | Propósito |
|------|-----------|----------|
| **Presentación** | React 18, MUI, Vite | UI interactiva |
| **API** | ASP.NET Core 8, Controllers | REST endpoints |
| **Negocio** | Services (C#) | Lógica de reglas |
| **Datos** | Entity Framework Core 8 | ORM |
| **BD** | SQL Server 2019+ | Persistencia |
| **Auth** | JWT + BCrypt | Seguridad |

## Entidades Principales (11)

1. **User** - Cuentas login
2. **Employee** - Empleados
3. **TimeEntry** - Fichajes
4. **TimeCorrection** - Correcciones
5. **TimeDailySummary** - Resumen diario
6. **VacationRequest** - Solicitudes vacaciones
7. **VacationBalance** - Saldo de días
8. **VacationPolicy** - Políticas empresa
9. **Employee_WorkSchedule** - Horarios
10. **Calendar_Days** - Calendario festivos
11. **AuditLog** - Auditoría cambios

## API Endpoints Principales (20+)

**Autenticación:**
- POST /api/auth/login
- POST /api/auth/logout

**Fichajes:**
- POST /api/timeentries/checkin
- POST /api/timeentries/checkout
- GET /api/timeentries/entries/{employeeId}
- GET /api/timeentries/daily-summary/{employeeId}

**Correcciones:**
- POST /api/timecorrections
- GET /api/timecorrections/pending
- PUT /api/timecorrections/{id}/approve
- PUT /api/timecorrections/{id}/reject

**Vacaciones:**
- POST /api/vacationrequests
- GET /api/vacationrequests/pending
- PUT /api/vacationrequests/{id}/approve
- GET /api/vacationbalance/{employeeId}

**Empleados:**
- GET /api/employees
- GET /api/employees/{employeeId}
- PUT /api/employees/{employeeId}

**Horarios:**
- GET /api/workschedules/{employeeId}
- POST /api/workschedules
- PUT /api/workschedules/{id}
- DELETE /api/workschedules/{id}

## Roles y Permisos

| Rol | Acceso | Acciones |
|-----|--------|----------|
| **ADMIN** | Todo | CRUD empleados, aprobar, ver reportes |
| **MANAGER** | Subordinados | Ver datos, aprobar solicitudes |
| **EMPLOYEE** | Solo sí mismo | Ver propio registro, solicitar |

## Próximos Pasos (Iniciativas Futuras)

### Iniciativa 1: Horarios Flexibles por Día
- Cambiar de 1 horario a 7 (Lun-Dom)
- Nueva entidad: `WorkScheduleDayDetail`

### Iniciativa 2: Calendarios por País
- Crear `CalendarTemplate` (España, India, etc.)
- Crear `CompanyConvention` (días especiales empresa)

### Iniciativa 3: Reportes Mensuales Congelados
- Nueva entidad: `MonthlyReport`
- Snapshots mensuales de datos
- Firma de manager

---

**Este documento es tu guía completa. Desde BD hasta frontend, todo está aquí.**

