# test-021 — Login seguro de usuario único

## Casos de prueba manuales

### TC-001 — Login con credenciales correctas
**Precondición:** El backend está ejecutándose con variables de entorno configuradas (`AUTH_EMAIL`, `AUTH_PASSWORD_HASH` válido). Estás en `/login`.

**Pasos:**
1. Ingresa el email correcto en el campo "Email"
2. Ingresa la contraseña correcta en el campo "Contraseña"
3. Haz clic en "Iniciar sesión"

**Resultado esperado:** 
- Se muestra el spinner "Iniciando sesión..."
- Después de 1-2 segundos, la página redirige a `/` (Dashboard)
- El usuario está autenticado y puede navegar por la app

**Estado:** ⬜ Pendiente

---

### TC-002 — Login con email incorrecto
**Precondición:** Estás en `/login`.

**Pasos:**
1. Ingresa un email incorrecto (ej. `wrong@example.com`)
2. Ingresa cualquier contraseña
3. Haz clic en "Iniciar sesión"

**Resultado esperado:**
- Se muestra el mensaje genérico "Credenciales inválidas"
- No se redirige a ningún lado
- El campo de contraseña se limpia

**Estado:** ⬜ Pendiente

---

### TC-003 — Login con contraseña incorrecta
**Precondición:** Estás en `/login` y sabes el email correcto.

**Pasos:**
1. Ingresa el email correcto
2. Ingresa una contraseña incorrecta
3. Haz clic en "Iniciar sesión"

**Resultado esperado:**
- Se muestra el mensaje genérico "Credenciales inválidas" (sin indicar si fue el email o la contraseña)
- No se redirige
- El campo de contraseña se limpia

**Estado:** ⬜ Pendiente

---

### TC-004 — Acceso a ruta protegida sin sesión
**Precondición:** Las cookies están vacías o expiradas. Entras a `http://localhost:5173/` directamente.

**Pasos:**
1. Navega a `/` en el navegador (o cualquier ruta protegida como `/projects`, `/finances/expenses`, etc.)

**Resultado esperado:**
- Se muestra brevemente un spinner "Cargando..."
- Luego eres redirigido a `/login`
- No se ve contenido de la app

**Estado:** ⬜ Pendiente

---

### TC-005 — Logout desde Sidebar
**Precondición:** Estás autenticado y ves la app con el Sidebar.

**Pasos:**
1. Haz scroll hacia abajo en el Sidebar
2. Haz clic en el botón "Cerrar sesión"

**Resultado esperado:**
- Se limpia la cookie de sesión
- Se redirige a `/login`
- Al intentar acceder a una ruta protegida, eres redirigido nuevamente a `/login`

**Estado:** ⬜ Pendiente

---

### TC-006 — GET /auth/me con sesión válida
**Precondición:** Estás autenticado (tienes una cookie `auth_token` válida).

**Pasos:**
1. Abre la consola del navegador (DevTools → Network)
2. Navega a `/` (Dashboard)
3. Filtra por peticiones XHR/Fetch y busca `/auth/me`

**Resultado esperado:**
- Se hace una petición `GET /auth/me`
- La respuesta es `200 OK` con `{ statusCode: 200, message: "success", data: { email: "tu-email@example.com" } }`
- La cookie `auth_token` se envía automáticamente (HttpOnly)

**Estado:** ⬜ Pendiente

---

### TC-007 — GET /auth/me sin sesión
**Precondición:** Estás en `/login` (sin sesión válida). Las cookies están vacías.

**Pasos:**
1. Abre DevTools → Network
2. Busca si hay una petición a `/auth/me`
3. Si no la hay, abre manualmente `http://localhost:3000/api/v1/auth/me` en una pestaña nueva (desarrollo)

**Resultado esperado:**
- La petición devuelve `401 Unauthorized`
- El mensaje indica "Missing authentication cookie" o "Invalid or expired token"

**Estado:** ⬜ Pendiente

---

### TC-008 — Rate limiting en /auth/login
**Precondición:** Estás en `/login`.

**Pasos:**
1. Intenta hacer login 6 veces consecutivas con credenciales incorrectas (muy rápido)
2. Observa las respuestas

**Resultado esperado:**
- Los primeros 5 intentos devuelven `401 Unauthorized` con "Credenciales inválidas"
- El 6º intento devuelve `429 Too Many Requests` con un mensaje del throttler
- El botón muestra "Iniciando sesión..." pero el servidor rechaza la petición

**Estado:** ⬜ Pendiente

---

### TC-009 — Cookie httpOnly y flags de seguridad
**Precondición:** Estás autenticado. Tienes acceso a DevTools.

**Pasos:**
1. Abre DevTools → Application → Cookies → `localhost`
2. Busca la cookie `auth_token`
3. Comprueba sus propiedades

**Resultado esperado:**
- **En desarrollo (NODE_ENV=development):**
  - ✅ `HttpOnly`: checked (no accesible desde JavaScript)
  - ✅ `Secure`: unchecked (porque es localhost sin HTTPS)
  - ✅ `SameSite`: Lax (protección contra CSRF)
  - ✅ `Max-Age`: ~2592000 segundos (30 días)
- **En producción (NODE_ENV=production):**
  - ✅ `HttpOnly`: checked
  - ✅ `Secure`: checked (requerido para HTTPS)
  - ✅ `SameSite`: None (permite cross-site, requerido porque Vercel ≠ Railway)
  - ✅ `Max-Age`: ~2592000 segundos

**Estado:** ⬜ Pendiente

---

### TC-010 — Dark mode durante login
**Precondición:** Estás en `/login`.

**Pasos:**
1. Prueba con dark mode activado (clase `dark` en `<html>`)
2. Prueba con light mode
3. Verifica que el formulario es legible en ambos modos

**Resultado esperado:**
- Texto, bordes y fondos adaptan los colores correctamente
- El botón de login es visible y clickeable
- Los mensajes de error son legibles

**Estado:** ⬜ Pendiente

---

### TC-011 — Validación de formulario (lado cliente)
**Precondición:** Estás en `/login`.

**Pasos:**
1. Intenta enviar el formulario sin escribir nada (campos vacíos)
2. Escribe un email inválido (ej. "notanemail") y intenta enviar
3. Escribe un email válido pero deja contraseña vacía

**Resultado esperado:**
- Se muestran mensajes de error debajo del campo correspondiente:
  - Email vacío: "El email es requerido"
  - Email inválido: "Email inválido"
  - Contraseña vacía: "La contraseña es requerida"
- El botón no envía el formulario si hay errores

**Estado:** ⬜ Pendiente

---

## Casos de prueba e2e (MCP)

### TC-MCP-001 — POST /mcp sin API key
**Herramienta probada:** Cualquiera (ej. `list_projects`).
**Precondición:** El backend está ejecutándose.

**Input de prueba:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"list_projects","params":{},"id":1}'
```
(Sin header `Authorization`)

**Output esperado:** 
- Status: `401 Unauthorized`
- Cuerpo: `{ "statusCode": 401, "message": "Missing or invalid authorization header", ... }`

**Estado:** ⬜ Pendiente

---

### TC-MCP-002 — POST /mcp con API key inválida
**Herramienta probada:** Cualquiera.
**Precondición:** El backend está ejecutándose.

**Input de prueba:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{"jsonrpc":"2.0","method":"list_projects","params":{},"id":1}'
```

**Output esperado:**
- Status: `401 Unauthorized`
- Cuerpo: `{ "statusCode": 401, "message": "Invalid API key", ... }`

**Estado:** ⬜ Pendiente

---

### TC-MCP-003 — POST /mcp con API key válida
**Herramienta probada:** `list_projects`.
**Precondición:** Sabes el valor de `MCP_API_KEY` en `.env`.

**Input de prueba:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","method":"list_projects","params":{},"id":1}'
```

**Output esperado:**
- Status: `200 OK` (o conforme la herramienta responda)
- Cuerpo: JSON-RPC con resultado válido (lista de proyectos, aunque sea vacía)
- Ejemplo: `{ "jsonrpc":"2.0","result":[...],"id":1 }`

**Estado:** ⬜ Pendiente

---

### TC-MCP-004 — GET /mcp sin API key (SSE)
**Herramienta probada:** GET /mcp con streaming.
**Precondición:** El backend está ejecutándose.

**Input de prueba:**
```bash
curl -X GET http://localhost:3000/mcp \
  -H "Content-Type: application/json"
```

**Output esperado:**
- Status: `401 Unauthorized`
- Cuerpo: `{ "statusCode": 401, "message": "Missing or invalid authorization header", ... }`

**Estado:** ⬜ Pendiente

---

### TC-MCP-005 — GET /auth/me con JWT válido (no requiere MCP API key)
**Precondición:** Tienes un JWT válido en cookie.

**Input de prueba:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Cookie: auth_token=$JWT_TOKEN"
```

**Output esperado:**
- Status: `200 OK`
- Cuerpo: `{ "statusCode": 200, "message": "success", "data": { "email": "..." } }`
- **Nota:** `/auth/me` usa JWT-cookie, NO MCP API key (son flujos de auth distintos)

**Estado:** ⬜ Pendiente

---

## Resumen de estado

| TC | Nombre | Estado |
|-----|----|--------|
| TC-001 | Login con credenciales correctas | ⬜ |
| TC-002 | Login con email incorrecto | ⬜ |
| TC-003 | Login con contraseña incorrecta | ⬜ |
| TC-004 | Acceso a ruta protegida sin sesión | ⬜ |
| TC-005 | Logout desde Sidebar | ⬜ |
| TC-006 | GET /auth/me con sesión válida | ⬜ |
| TC-007 | GET /auth/me sin sesión | ⬜ |
| TC-008 | Rate limiting en /auth/login | ⬜ |
| TC-009 | Cookie httpOnly y flags de seguridad | ⬜ |
| TC-010 | Dark mode durante login | ⬜ |
| TC-011 | Validación de formulario (lado cliente) | ⬜ |
| TC-MCP-001 | POST /mcp sin API key | ⬜ |
| TC-MCP-002 | POST /mcp con API key inválida | ⬜ |
| TC-MCP-003 | POST /mcp con API key válida | ⬜ |
| TC-MCP-004 | GET /mcp sin API key (SSE) | ⬜ |
| TC-MCP-005 | GET /auth/me con JWT válido | ⬜ |
