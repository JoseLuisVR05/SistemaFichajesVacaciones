SELECT * FROM __EFMigrationsHistory;
SELECT * FROM AuditLog;
SELECT * FROM Calendar_Days;
SELECT * FROM EmployeesStaging;
SELECT * FROM Employee_WorkSchedules;
SELECT * FROM Employees;
SELECT * FROM ImportRuns;
SELECT * FROM ImportErrors;
SELECT * FROM Roles;
SELECT * FROM TimeCorrections;
SELECT * FROM TimeDailySummaries;
SELECT * FROM TimeEntries;
SELECT * FROM UserRoles;
SELECT * FROM Users;

DELETE FROM TimeDailySummaries;
DBCC CHECKIDENT ('TimeDailySummaries', RESEED, 0);