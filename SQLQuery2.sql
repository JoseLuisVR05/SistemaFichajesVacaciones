USE FichajesVacacionesDB;
GO


MERGE Employees AS target
USING Employees_Staging AS source
ON target.EmployeeCode = source.EmployeeCode

WHEN MATCHED THEN
    UPDATE SET
        target.FullName = source.FullName,
        target.Email = source.Email,
        target.Department = source.Department,
        target.IsActive = source.IsActive,
        target.StartDate = source.StartDate,
        target.EndDate = source.EndDate,
        target.UpdatedAt = SYSDATETIME()

WHEN NOT MATCHED THEN
    INSERT (EmployeeCode, FullName, Email, Department, IsActive, StartDate)
    VALUES (source.EmployeeCode, source.FullName, source.Email, source.Department, source.IsActive, source.StartDate);


-- =============================================
-- SCRIPT BASE DE DATOS - SISTEMA FICHAJES
-- Proyecto 1: Núcleo + Fichajes (Mes 1-2)
-- =============================================

USE master;
GO

-- Crear base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SistemaFichajesDB')
BEGIN
    CREATE DATABASE SistemaFichajesDB;
END
GO

USE SistemaFichajesDB;
GO

-- =============================================
-- 1. TABLAS COMUNES (NÚCLEO)
-- =============================================

-- Tabla: Employees (Empleados)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        EmployeeId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeCode NVARCHAR(50) NOT NULL UNIQUE,
        FullName NVARCHAR(200) NOT NULL,
        Email NVARCHAR(200) NOT NULL UNIQUE,
        Company NVARCHAR(100) NULL,
        BusinessUnit NVARCHAR(100) NULL,
        Department NVARCHAR(100) NULL,
        ManagerEmployeeId INT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        StartDate DATE NULL,
        EndDate DATE NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Employees_Manager FOREIGN KEY (ManagerEmployeeId) 
            REFERENCES Employees(EmployeeId)
    );
    
    CREATE INDEX IX_Employees_EmployeeCode ON Employees(EmployeeCode);
    CREATE INDEX IX_Employees_Email ON Employees(Email);
    CREATE INDEX IX_Employees_IsActive ON Employees(IsActive);
END
GO

-- Tabla: Calendar_Days (Días del calendario)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Calendar_Days')
BEGIN
    CREATE TABLE Calendar_Days (
        Date DATE PRIMARY KEY,
        IsWeekend BIT NOT NULL DEFAULT 0,
        IsHoliday BIT NOT NULL DEFAULT 0,
        HolidayName NVARCHAR(200) NULL,
        Region NVARCHAR(100) NULL,
        Location NVARCHAR(100) NULL
    );
    
    CREATE INDEX IX_Calendar_Days_Date ON Calendar_Days(Date);
END
GO

-- Tabla: Employee_WorkSchedule (Horarios de trabajo)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employee_WorkSchedule')
BEGIN
    CREATE TABLE Employee_WorkSchedule (
        WorkScheduleId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        ValidFrom DATE NOT NULL,
        ValidTo DATE NULL,
        ExpectedStartTime TIME NOT NULL,
        ExpectedEndTime TIME NOT NULL,
        BreakMinutes INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_WorkSchedule_Employee FOREIGN KEY (EmployeeId) 
            REFERENCES Employees(EmployeeId) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_WorkSchedule_EmployeeId ON Employee_WorkSchedule(EmployeeId);
END
GO

-- =============================================
-- 2. SEGURIDAD Y AUTENTICACIÓN
-- =============================================

-- Tabla: Users (Usuarios del sistema)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(200) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(500) NOT NULL,
        EmployeeId INT NULL,
        IsEnabled BIT NOT NULL DEFAULT 1,
        LastLoginAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Users_Employee FOREIGN KEY (EmployeeId) 
            REFERENCES Employees(EmployeeId)
    );
    
    CREATE INDEX IX_Users_Email ON Users(Email);
END
GO

-- Tabla: Roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        RoleId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE,
        Description NVARCHAR(200) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Tabla: UserRoles (Relación muchos a muchos)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        AssignedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_User FOREIGN KEY (UserId) 
            REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Role FOREIGN KEY (RoleId) 
            REFERENCES Roles(RoleId) ON DELETE CASCADE
    );
END
GO

-- =============================================
-- 3. TABLAS DE FICHAJES (PROYECTO 1)
-- =============================================

-- Tabla: TimeEntries (Registros de entrada/salida)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TimeEntries')
BEGIN
    CREATE TABLE TimeEntries (
        TimeEntryId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        EntryType NVARCHAR(20) NOT NULL CHECK (EntryType IN ('IN', 'OUT', 'ADJUSTMENT')),
        EventTime DATETIME2 NOT NULL,
        Source NVARCHAR(20) NOT NULL DEFAULT 'WEB' CHECK (Source IN ('WEB', 'MOBILE', 'ADMIN')),
        GeoLocation NVARCHAR(200) NULL,
        DeviceId NVARCHAR(100) NULL,
        Comment NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedByUserId INT NULL,
        CONSTRAINT FK_TimeEntries_Employee FOREIGN KEY (EmployeeId) 
            REFERENCES Employees(EmployeeId) ON DELETE CASCADE,
        CONSTRAINT FK_TimeEntries_User FOREIGN KEY (CreatedByUserId) 
            REFERENCES Users(UserId)
    );
    
    CREATE INDEX IX_TimeEntries_EmployeeId ON TimeEntries(EmployeeId);
    CREATE INDEX IX_TimeEntries_EventTime ON TimeEntries(EventTime);
    CREATE INDEX IX_TimeEntries_Employee_EventTime ON TimeEntries(EmployeeId, EventTime);
END
GO

-- Tabla: TimeCorrections (Correcciones de tiempo)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TimeCorrections')
BEGIN
    CREATE TABLE TimeCorrections (
        CorrectionId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        Date DATE NOT NULL,
        OriginalMinutes INT NULL,
        CorrectedMinutes INT NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'PENDING' 
            CHECK (Status IN ('PENDING', 'APPROVED', 'REJECTED')),
        ApprovedByUserId INT NULL,
        ApprovedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TimeCorrections_Employee FOREIGN KEY (EmployeeId) 
            REFERENCES Employees(EmployeeId) ON DELETE CASCADE,
        CONSTRAINT FK_TimeCorrections_ApprovedBy FOREIGN KEY (ApprovedByUserId) 
            REFERENCES Users(UserId)
    );
    
    CREATE INDEX IX_TimeCorrections_EmployeeId ON TimeCorrections(EmployeeId);
    CREATE INDEX IX_TimeCorrections_Status ON TimeCorrections(Status);
END
GO

-- Tabla: TimeDailySummary (Resumen diario de tiempo trabajado)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TimeDailySummary')
BEGIN
    CREATE TABLE TimeDailySummary (
        SummaryId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        Date DATE NOT NULL,
        WorkedMinutes INT NOT NULL DEFAULT 0,
        ExpectedMinutes INT NOT NULL DEFAULT 0,
        BalanceMinutes AS (WorkedMinutes - ExpectedMinutes) PERSISTED,
        LastCalculatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TimeDailySummary_Employee FOREIGN KEY (EmployeeId) 
            REFERENCES Employees(EmployeeId) ON DELETE CASCADE,
        CONSTRAINT UQ_TimeDailySummary_Employee_Date UNIQUE (EmployeeId, Date)
    );
    
    CREATE INDEX IX_TimeDailySummary_EmployeeId ON TimeDailySummary(EmployeeId);
    CREATE INDEX IX_TimeDailySummary_Date ON TimeDailySummary(Date);
END
GO

-- =============================================
-- 4. AUDITORÍA Y TRAZABILIDAD
-- =============================================

-- Tabla: AuditLog (Registro de auditoría)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLog')
BEGIN
    CREATE TABLE AuditLog (
        AuditId INT IDENTITY(1,1) PRIMARY KEY,
        EntityName NVARCHAR(100) NOT NULL,
        EntityId INT NOT NULL,
        Action NVARCHAR(20) NOT NULL CHECK (Action IN ('CREATE', 'UPDATE', 'DELETE')),
        OldValueJson NVARCHAR(MAX) NULL,
        NewValueJson NVARCHAR(MAX) NULL,
        PerformedByUserId INT NULL,
        PerformedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AuditLog_User FOREIGN KEY (PerformedByUserId) 
            REFERENCES Users(UserId)
    );
    
    CREATE INDEX IX_AuditLog_EntityName ON AuditLog(EntityName);
    CREATE INDEX IX_AuditLog_PerformedAt ON AuditLog(PerformedAt);
END
GO

-- =============================================
-- 5. IMPORTACIÓN DESDE AXAPTA (CSV)
-- =============================================

-- Tabla: Employees_Staging (Tabla temporal para importación)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees_Staging')
BEGIN
    CREATE TABLE Employees_Staging (
        StagingId INT IDENTITY(1,1) PRIMARY KEY,
        ImportRunId INT NOT NULL,
        EmployeeCode NVARCHAR(50) NOT NULL,
        FullName NVARCHAR(200) NOT NULL,
        Email NVARCHAR(200) NOT NULL,
        Company NVARCHAR(100) NULL,
        BusinessUnit NVARCHAR(100) NULL,
        Department NVARCHAR(100) NULL,
        ManagerEmployeeCode NVARCHAR(50) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        StartDate DATE NULL,
        EndDate DATE NULL,
        RawData NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_Employees_Staging_ImportRunId ON Employees_Staging(ImportRunId);
END
GO

-- Tabla: ImportRuns (Ejecuciones de importación)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ImportRuns')
BEGIN
    CREATE TABLE ImportRuns (
        ImportRunId INT IDENTITY(1,1) PRIMARY KEY,
        FileName NVARCHAR(500) NOT NULL,
        StartedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CompletedAt DATETIME2 NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'RUNNING' 
            CHECK (Status IN ('RUNNING', 'COMPLETED', 'FAILED')),
        TotalRows INT NOT NULL DEFAULT 0,
        SuccessRows INT NOT NULL DEFAULT 0,
        ErrorRows INT NOT NULL DEFAULT 0,
        ExecutedByUserId INT NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        CONSTRAINT FK_ImportRuns_User FOREIGN KEY (ExecutedByUserId) 
            REFERENCES Users(UserId)
    );
    
    CREATE INDEX IX_ImportRuns_StartedAt ON ImportRuns(StartedAt);
END
GO

-- Tabla: ImportErrors (Errores de importación)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ImportErrors')
BEGIN
    CREATE TABLE ImportErrors (
        ErrorId INT IDENTITY(1,1) PRIMARY KEY,
        ImportRunId INT NOT NULL,
        RowNumber INT NOT NULL,
        ErrorType NVARCHAR(50) NOT NULL,
        ErrorMessage NVARCHAR(MAX) NOT NULL,
        RawData NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ImportErrors_ImportRun FOREIGN KEY (ImportRunId) 
            REFERENCES ImportRuns(ImportRunId) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_ImportErrors_ImportRunId ON ImportErrors(ImportRunId);
END
GO

-- =============================================
-- 6. DATOS INICIALES (SEED DATA)
-- =============================================

-- Insertar roles predefinidos
IF NOT EXISTS (SELECT * FROM Roles WHERE Name = 'ADMIN')
BEGIN
    INSERT INTO Roles (Name, Description) VALUES
    ('ADMIN', 'Administrador del sistema con acceso completo'),
    ('RRHH', 'Recursos Humanos con gestión de empleados y aprobaciones'),
    ('MANAGER', 'Responsable de equipo con permisos de aprobación'),
    ('EMPLOYEE', 'Empleado con acceso básico');
END
GO

-- Insertar días festivos de ejemplo para 2025 (España)
IF NOT EXISTS (SELECT * FROM Calendar_Days WHERE Date = '2025-01-01')
BEGIN
    INSERT INTO Calendar_Days (Date, IsWeekend, IsHoliday, HolidayName, Region) VALUES
    ('2025-01-01', 0, 1, 'Año Nuevo', 'ES'),
    ('2025-01-06', 0, 1, 'Reyes Magos', 'ES'),
    ('2025-04-18', 0, 1, 'Viernes Santo', 'ES'),
    ('2025-05-01', 0, 1, 'Día del Trabajo', 'ES'),
    ('2025-08-15', 0, 1, 'Asunción de la Virgen', 'ES'),
    ('2025-10-12', 0, 1, 'Día de la Hispanidad', 'ES'),
    ('2025-11-01', 0, 1, 'Todos los Santos', 'ES'),
    ('2025-12-06', 0, 1, 'Día de la Constitución', 'ES'),
    ('2025-12-08', 0, 1, 'Inmaculada Concepción', 'ES'),
    ('2025-12-25', 0, 1, 'Navidad', 'ES');
END
GO

PRINT 'Base de datos creada correctamente con todas las tablas esenciales.';
PRINT 'Próximo paso: Ejecutar migraciones desde Entity Framework Core.';
GO