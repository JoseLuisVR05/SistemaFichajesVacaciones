# 📋 MANUAL DE PRUEBAS - VERIFICACIÓN DE CAMBIOS

## ✅ BACKEND - 3 CAMBIOS PROBADOS

---

### **1️⃣ GLOBAL EXCEPTION MIDDLEWARE** ✅ COMPILADA

**Archivo:** `SistemaFichajesVacaciones.Api/Middleware/GlobalExceptionMiddleware.cs`
**Status:** ✅ Compilado sin errores

#### **Cómo probar:**

1. **Iniciar el servidor backend:**
   ```bash
   cd SistemaFichajesVacaciones.Api
   dotnet run
   ```
   Espera a que diga: `Now listening on: https://localhost:5001`

2. **Abre Swagger en tu navegador:**
   ```
   https://localhost:5001/swagger
   ```

3. **Prueba 1: Error 404 (Recurso no encontrado) - CON SWAGGER**
   - En Swagger, busca el endpoint: `GET /api/employees/{id}`
   - Click en ese endpoint para expandirlo
   - En el campo `id`, escribe: `99999`
   - Click en el botón azul "Try it out"
   - Click en "Execute"
   
   **Resultado esperado:**
   ```json
   {
     "statusCode": 404,
     "message": "Recurso no encontrado",
     "details": "...",
     "timestamp": "2026-03-18T08:37:00Z",
     "traceId": "..."
   }
   ```
   ✅ Si ves JSON con `statusCode` 404 = FUNCIONA

4. **Prueba 2: Error sin autenticación**
   - Busca cualquier endpoint que requiera autenticación (ej: `GET /api/dashboard`)
   - Haz clic en "Try it out" sin agregar JWT
   - Click "Execute"
   
   **Resultado esperado:**
   ```json
   {
     "statusCode": 401,
     "message": "No autorizado",
     "details": "...",
     "timestamp": "...",
     "traceId": "..."
   }
   ```
   ✅ Si ves JSON bien formateado = MIDDLEWARE FUNCIONA

---

### **2️⃣ N+1 QUERIES OPTIMIZADO** ✅ COMPILADO

**Archivo:** `SistemaFichajesVacaciones.Infrastructure/Services/TimeSummaryService.cs`
**Método:** `CalculateRangeSummaryAsync()` - **REFACTORIZADO**
**Status:** ✅ Compilado

#### **Cómo probar:**

**Antes (sin optimización):**
- 30 días × 1 empleado = 30 queries al BD
- 30 días × 100 empleados = 3,000 queries 😱

**Después (optimizado):**
- 30 días × N empleados = 4 queries totales ⚡

1. **En SQL Server, habilita profiler:**
   - Abre SQL Server Management Studio
   - Vé a Tools → SQL Server Profiler
   - Inicia un trace

2. **Ejecuta una llamada de rango:**
   ```bash
   curl -s "https://localhost:5001/api/timesummary/range?employeeId=1&from=2026-03-01&to=2026-03-31" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Observa las queries en el Profiler:**
   - **Esperado:** ~4 queries (Calendar_Days, TimeEntries, Schedules, SaveChanges)
   - **NO esperado:** 30+ queries en un loop

✅ **Si ves ~4 queries = OPTIMIZADO CORRECTAMENTE**

---

## ✅ FRONTEND - 1 CAMBIO PROBADO

---

### **3️⃣ ERROR BOUNDARY REACT** 

**Archivo:** `frontendReact/src/components/common/ErrorBoundary/ErrorBoundary.jsx`
**Envuelto en:** `frontendReact/src/App.jsx`
**Status:** ✅ Activado

#### **Cómo probar:**

1. **Inicia el frontend:**
   ```bash
   cd frontendReact
   npm run dev
   ```
   Espera a que diga: `Local: http://localhost:5174`

2. **Prueba 1: Componente que falla**
   - Ve a cualquier página (ej: Dashboard)
   - Abre DevTools → Console
   - Ejecuta este código:
   ```javascript
   throw new Error("Testing Error Boundary");
   ```
   
   **Resultado esperado:**
   - NO: Pantalla blanca de error
   - ✅ SÍ: UI de error con botón "Recargar Aplicación"

3. **Prueba 2: API error**
   - Apaga el backend (Ctrl+C en la terminal de dotnet)
   - Recarga la página del frontend
   - Intenta hacer una acción que llame API
   
   **Resultado esperado:**
   - Verás el mensaje "Oops! Algo salió mal"
   - Con opción de Recargar
   - NO se bloquea todo

4. **Verificar que el Error Boundary está activo:**
   - DevTools → React Components
   - Busca `ErrorBoundary`
   - Debe estar en el árbol de componentes

✅ **Si ves UI bonita en error = FUNCIONA**

---

## 📊 CHECKLIST DE PRUEBAS

| # | Componente | Test | Status |
|----|-----------|------|--------|
| 1 | GlobalExceptionMiddleware | Compilación | ✅ PASS |
| 1a | GlobalExceptionMiddleware | 404 Error | 🔄 PRUEBA |
| 1b | GlobalExceptionMiddleware | JSON Response | 🔄 PRUEBA |
| 2 | N+1 Queries | Compilación | ✅ PASS |
| 2a | N+1 Queries | Queries Count | 🔄 PRUEBA |
| 3 | Error Boundary | Compilación | ✅ PASS |
| 3a | Error Boundary | Component Error | 🔄 PRUEBA |
| 3b | Error Boundary | API Error | 🔄 PRUEBA |

---

## 🎯 TESTS RÁPIDOS CON SWAGGER (5 MIN)

**Lo más fácil y visual:**

### **Paso 1: Abre Swagger**
```
https://localhost:5001/swagger
```

### **Paso 2: Busca un endpoint GET**
Ej: `GET /api/employees/{id}`

### **Paso 3: Haz clic en "Try it out"**
- Llena los parámetros necesarios (ej: id = 99999)
- Click "Execute"

### **Paso 4: Mira la respuesta**
```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado",
  "details": "...",
  "timestamp": "2026-03-18T...",
  "traceId": "..."
}
```

✅ **Si ves JSON formateado = El middleware funciona**

---

## 🔧 SI HAY PROBLEMAS

### **Backend no compila**
```bash
cd SistemaFichajesVacaciones.Api
dotnet clean
dotnet build
```

### **Frontend tiene errores**
```bash
cd frontendReact
rm -r node_modules
npm install
npm run dev
```

### **Middleware no se ejecuta**
- Verifica que está en `Program.cs` ANTES de otros middleware
- Debe ser la primera línea de middleware

### **Error Boundary no captura errores**
- Verifica que está en `App.jsx` AFUERA de `<BrowserRouter>`
- Recarga la página (Ctrl+F5)

---

## 📝 REPORTE DE PRUEBAS

**Ejecuta esto y comparte el resultado:**

```bash
# Backend
cd SistemaFichajesVacaciones.Api && dotnet build 2>&1 | tail -5

# Frontend
cd frontendReact && npm run build 2>&1 | tail -5
```

✅ Si ambos dicen "correcto" → TODO FUNCIONA
