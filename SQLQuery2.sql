USE FichajesVacacionesDB;
GO

-- Verificar si ya hay datos
SELECT * FROM Employees;
GO

-- Si está vacía, insertar datos de prueba
INSERT INTO Employees (EmployeeCode, FullName, Email, Company, BusinessUnit, Department, IsActive, StartDate, CreatedAt, UpdatedAt)
VALUES 
('EMP001', 'Ana García López', 'ana.garcia@empresa.com', 'Empresa SA', 'Operaciones', 'IT', 1, '2023-01-15', GETDATE(), GETDATE()),
('EMP002', 'Carlos Martínez Ruiz', 'carlos.martinez@empresa.com', 'Empresa SA', 'Operaciones', 'IT', 1, '2023-03-20', GETDATE(), GETDATE()),
('EMP003', 'Laura Fernández Torres', 'laura.fernandez@empresa.com', 'Empresa SA', 'Ventas', 'Comercial', 1, '2023-02-10', GETDATE(), GETDATE()),
('EMP004', 'Miguel Sánchez Pérez', 'miguel.sanchez@empresa.com', 'Empresa SA', 'RRHH', 'Administración', 1, '2022-11-05', GETDATE(), GETDATE()),
('EMP005', 'Elena Rodríguez Gómez', 'elena.rodriguez@empresa.com', 'Empresa SA', 'Operaciones', 'Producción', 1, '2023-04-12', GETDATE(), GETDATE());
GO

-- Verificar que se insertaron
SELECT * FROM Employees;
GO

CREATE TABLE Employees_Staging (
    StagingId INT IDENTITY PRIMARY KEY,
    EmployeeCode NVARCHAR(50),
    FullName NVARCHAR(150),
    Email NVARCHAR(150),
    Department NVARCHAR(100),
    ManagerEmployeeCode NVARCHAR(50),
    IsActive BIT,
    StartDate DATE,
    EndDate DATE,
    ImportRunId INT,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE ImportRuns (
    ImportRunId INT IDENTITY PRIMARY KEY,
    FileName NVARCHAR(255),
    ImportedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    TotalRows INT,
    SuccessRows INT,
    ErrorRows INT
);

CREATE TABLE ImportErrors (
    ErrorId INT IDENTITY PRIMARY KEY,
    ImportRunId INT NOT NULL,
    RowNumber INT,
    ErrorMessage NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ImportErrors_Run
        FOREIGN KEY (ImportRunId) REFERENCES ImportRuns(ImportRunId)
);

INSERT INTO Employees_Staging
(EmployeeCode, FullName, Email, Department, IsActive, StartDate)
VALUES
('EMP003', 'Paloma Pérez', 'paloma.perez@empresa.com', 'RRHH', 1, '2026-01-01')


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




CREATE TABLE TimeEntries (
    TimeEntryId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    EntryType NVARCHAR(20) NOT NULL,    -- IN, OUT, ADJUSTMENT
    EventTime DATETIME2 NOT NULL,
    Source NVARCHAR(50) NOT NULL,      -- WEB, MOBILE, ADMIN
    GeoLocation NVARCHAR(255) NULL,
    DeviceId NVARCHAR(100) NULL,
    Comment NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CreatedByUserId INT NOT NULL,      -- El ID del usuario que registra (en el MVP puede ser el mismo EmployeeId)

    -- Relación con la tabla de empleados
    CONSTRAINT FK_TimeEntries_Employees FOREIGN KEY (EmployeeId) 
        REFERENCES Employees(EmployeeId)
);

SELECT * FROM TimeEntries;

SELECT * FROM Employees;