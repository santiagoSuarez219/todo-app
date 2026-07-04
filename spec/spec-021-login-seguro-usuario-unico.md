# spec-021 — [IN PROGRESS] Login seguro de usuario único

> Estado inicial: sin marcar (aún no implementado). Según el `CLAUDE.md` raíz,
> el estado `[IN PROGRESS]` se coloca en el título al iniciar la Fase 1. Al
> terminar la implementación pasa a `[TESTING]` y, tras aprobar pruebas, a `[DONE]`.

## Contexto

La aplicación es de uso personal (un solo usuario) y hoy **no tiene autenticación**:
cualquier persona con acceso a la URL de producción (Vercel) puede leer y modificar
proyectos, actividades y todo el dominio financiero, y cualquier cliente puede
invocar el endpoint `/mcp` sin restricción. Tanto `backend/CLAUDE.md` como
`frontend/CLAUDE.md` declaran explícitamente "Autenticación: no implementada".

Se necesita una barrera de acceso simple pero segura: un login de correo +
contraseña para el único usuario autorizado, cuyas credenciales viven en variables
de entorno (nunca en la base de datos ni en disco en claro), y una protección
independiente por API key para el endpoint `/mcp`, que consumen agentes externos
por HTTP/SSE y que no pueden autenticarse mediante cookie de sesión.

## Alcance

**Incluye:**
- Módulo de autenticación en el backend (`auth/`) con tres endpoints:
  `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Usuario único definido por `.env` (`AUTH_EMAIL`, `AUTH_PASSWORD_HASH` con hash
  bcrypt, `JWT_SECRET`, `JWT_EXPIRES_IN`).
- Sesión mediante **JWT firmado entregado en cookie `httpOnly`**
  (`SameSite` + `Secure` en producción); el frontend nunca lee el token por JavaScript.
- **Guard global de NestJS** que protege todos los endpoints bajo `/api/v1`
  (salvo login/logout y healthcheck/docs) y también `/mcp`.
- **Esquema de auth propio para `/mcp`**: token estático `MCP_API_KEY` validado por
  header `Authorization: Bearer <token>`, separado del JWT de usuario. El guard
  distingue la ruta `/mcp` y aplica la validación de API key en lugar del JWT-cookie.
- Frontend: pantalla `/login` (React Hook Form + Zod), guard de rutas que redirige
  a `/login` si no hay sesión (vía `GET /auth/me`), manejo de `401` en el
  interceptor de Axios, y acción de logout.
- Protección contra fuerza bruta en el endpoint de login con `@nestjs/throttler`.
- Actualización de documentación de MCP (`docs/mcps/README.md` y ambos system
  prompts) para reflejar el requisito de API key.

**No incluye:**
- Registro de usuarios, recuperación de contraseña ni gestión multiusuario.
- Roles, permisos ni scopes.
- Refresh tokens ni rotación de tokens (el JWT tiene expiración fija; al vencer,
  el usuario vuelve a iniciar sesión).
- Cambios de esquema en la base de datos (ver justificación en Impacto).
- Cambios en la lógica de negocio de los recursos existentes.

## Decisiones tomadas (con el usuario)

| Decisión | Valor elegido |
|----------|---------------|
| Almacenamiento de contraseña | Hash **bcrypt** en `AUTH_PASSWORD_HASH` (nunca en claro) |
| Librería de hash | **`bcryptjs`** (JS puro, sin compilación nativa → evita fallos de build en Docker/Railway) |
| Mecanismo de sesión | **JWT firmado en cookie `httpOnly`** + `SameSite` + `Secure` (prod) |
| Alcance de protección | Guard global: REST `/api/v1` **y** `/mcp` |
| Auth del MCP | Token estático `MCP_API_KEY` vía header **`Authorization: Bearer`** |
| Rate limiting login | **Sí**, con `@nestjs/throttler` |
| Expiración del JWT | **30 días** (`JWT_EXPIRES_IN=30d`) |
| Logout | **Público / idempotente** (limpia cookie siempre) |
| `SameSite` en producción | **`None; Secure`** (frontend Vercel y backend Railway son dominios distintos → cookie cross-site) |
| Puerto dev backend | **3000** (real, según `main.ts` y proxy de Vite; los `CLAUDE.md` que dicen 3002 están desactualizados) |

## Impacto en el sistema

### Backend (`backend/src/`)

- **Nuevo módulo `auth/`**: controlador, servicio y DTO de login.
- **Nuevo guard global** en `common/guards/` que decide, según la ruta, entre
  validación JWT-cookie (REST) y validación de API key (`/mcp`).
- **Nuevo decorador `@Public()`** en `common/decorators/` para eximir del guard
  los endpoints públicos (login, logout, healthcheck).
- **`main.ts`**: registro de `cookie-parser` y ajuste de CORS a `credentials: true`
  con origen explícito (no `*`).
- **`app.module.ts`**: importar `AuthModule`, ampliar el `validationSchema` de Joi
  con las nuevas variables de entorno, registrar el guard global vía `APP_GUARD` y
  configurar `ThrottlerModule`.
- **`app.controller.ts`**: marcar su ruta raíz como `@Public()` (verificar primero
  qué ruta expone).
- **`mcp.controller.ts`**: no requiere cambios de código si el guard global
  intercepta `/mcp`; solo se valida que el guard permita el flujo `@Res()`/streaming.

**Base de datos — NO se requiere migración.** El usuario único vive íntegramente en
variables de entorno: el correo autorizado, el hash bcrypt de la contraseña y el
secreto del JWT están en `.env`. No hay entidad `User`, ni tabla de sesiones (el JWT
es stateless), ni columnas nuevas. Esto respeta la regla `synchronize: false` sin
introducir migraciones y mantiene el modelo actual intacto.

### Frontend (`frontend/src/`)

- **Nueva pantalla** `pages/Login.tsx` (formulario correo + contraseña con RHF + Zod).
- **Nuevo servicio** `services/auth.service.ts` (`login`, `logout`, `getMe`).
- **Nuevo hook** `hooks/useAuth.ts` (`useLogin`, `useLogout`, `useMe`).
- **Nuevo componente** `components/auth/ProtectedRoute.tsx` (verifica sesión con
  `useMe` y redirige a `/login`).
- **`lib/api-client.ts`**: activar `withCredentials: true` y manejar `401` en el
  interceptor (redirigir a `/login`, evitando bucles en `/auth/me` y `/auth/login`).
- **`App.tsx`**: añadir ruta pública `/login` y envolver el árbol de `MainLayout`
  en `ProtectedRoute`.
- **`types/index.ts`**: añadir `LoginDto` y `AuthUser` (shape de `/auth/me`),
  coincidiendo exactamente con el backend.
- **`components/layout/Sidebar.tsx`** (y opcionalmente `Tabbar.tsx`): botón/acción
  de cerrar sesión.
- **Dev**: usar el proxy de Vite (`/api/v1` relativo, mismo origen) para que la
  cookie `httpOnly` funcione sin fricción de CORS. Confirmar que `VITE_API_URL` en
  `.env.local` no fuerce un puerto cruzado en desarrollo.
- Lectura obligatoria de `frontend/DESIGN.md` antes de construir la UI de login.

### Infraestructura / configuración

- Nuevas variables de entorno en `.env` (local), `.env.docker` y proveedores de
  producción (Railway backend). El frontend no requiere variables nuevas.
- **CORS con credenciales**: en producción, frontend (Vercel) y backend (Railway)
  son dominios distintos → la cookie debe emitirse con `SameSite=None; Secure` y
  CORS con `credentials: true` y origen explícito (`FRONTEND_URL`).

## Evaluación MCP

**¿Aplica MCP?** Sí.

Este spec **no agrega ni modifica tools** del MCP `todo-api`, pero **cambia cómo se
accede al endpoint `/mcp`**: pasa de ser abierto a exigir una API key. Esto afecta a
cualquier agente que consuma el MCP y debe documentarse.

- **MCP existente a modificar:** `todo-api` — no se agregan/cambian herramientas; se
  agrega una **capa de autenticación por API key** (`MCP_API_KEY`) validada por
  header `Authorization: Bearer` en la ruta `/mcp`, dentro del guard global.
- **MCP nuevo a crear:** ninguno.
- **System prompts afectados:** `docs/mcps/asistente-personal.system-prompt.md` y
  `docs/mcps/finanzas-personales.system-prompt.md` — deben indicar que la conexión
  al MCP requiere el header `Authorization: Bearer <MCP_API_KEY>` (configurado en el
  cliente MCP del agente), independiente de las credenciales de usuario.
- **`docs/mcps/README.md`:** registrar el nuevo requisito de autenticación del
  endpoint `/mcp` y la variable `MCP_API_KEY`.
- **Fase de MCP en este spec:** Fase 6 (ejecutada por `@mcp-builder` de
  `backend/.agents/`), antes de la fase de pruebas.

## Fases de implementación

### Fase 1 — Backend: base de autenticación (módulo `auth/`)

- [x] Instalar dependencias backend aprobadas: `bcryptjs`, `@nestjs/jwt`,
      `cookie-parser`, `@nestjs/throttler` y sus `@types/*` (`@types/bcryptjs`,
      `@types/cookie-parser`) en `devDependencies`.
- [x] Crear `backend/src/auth/dto/login.dto.ts` (`email` con `@IsEmail`, `password`
      con `@IsString`/`@IsNotEmpty`).
- [x] Crear `backend/src/auth/auth.service.ts`:
  - Validación de credenciales: normalizar y comparar el email (insensible a
    mayúsculas/espacios) contra `AUTH_EMAIL`, y `bcrypt.compare(password, AUTH_PASSWORD_HASH)`.
  - Mensaje de error genérico ("Credenciales inválidas") sin revelar qué falló.
  - Firma del JWT con `JwtService` (`sub`/`email` en el payload, expiración desde
    `JWT_EXPIRES_IN`).
  - Helper para construir opciones de cookie (`httpOnly`, `sameSite`, `secure`
    según `NODE_ENV`, `maxAge` alineado con `JWT_EXPIRES_IN`).
- [x] Crear `backend/src/auth/auth.controller.ts`:
  - `POST /auth/login`: valida credenciales, firma JWT, setea cookie con
    `@Res({ passthrough: true })` (para que `TransformInterceptor` siga envolviendo
    la respuesta) y retorna el usuario (email) sin el token.
  - `POST /auth/logout`: limpia la cookie (`clearCookie`) y retorna éxito. Público.
  - `GET /auth/me`: retorna el usuario autenticado (leído del request por el guard);
    responde `401` si no hay sesión válida.
  - Marcar `login` y `logout` con `@Public()`.
- [x] Crear `backend/src/auth/auth.module.ts`: configurar `JwtModule` (secret desde
      `JWT_SECRET`, expiración desde `JWT_EXPIRES_IN`), declarar `AuthService` y
      `AuthController`, exportar lo necesario para el guard.
- [x] Importar `AuthModule` en `backend/src/app.module.ts`.

**Archivos:** crear `backend/src/auth/{auth.module.ts,auth.controller.ts,auth.service.ts,dto/login.dto.ts}`
· editar `backend/src/app.module.ts` ✅ **COMPLETADA**

### Fase 2 — Backend: guard global (JWT-cookie + API key para `/mcp`)

- [x] Crear `backend/src/common/decorators/public.decorator.ts` (`@Public()` vía
      `SetMetadata`).
- [x] (Opcional) Crear `backend/src/common/decorators/current-user.decorator.ts`
      para inyectar el usuario del request en los handlers.
- [x] Crear `backend/src/common/guards/auth.guard.ts` (implementa `CanActivate`):
  1. Si la ruta es `/mcp` (verificar por `request.path`/`request.url`, recordando
     que `/mcp` está fuera del prefijo `api/v1`): validar el header
     `Authorization: Bearer <token>` contra `MCP_API_KEY`; permitir o lanzar
     `UnauthorizedException`.
  2. Si el handler o el controlador están marcados con `@Public()` (leer metadata
     con `Reflector`): permitir.
  3. En otro caso: extraer el JWT de la cookie, verificarlo con `JwtService`; si es
     válido, adjuntar el usuario al `request` y permitir; si no,
     `UnauthorizedException`.
- [x] Registrar el guard globalmente vía `{ provide: APP_GUARD, useClass: AuthGuard }`,
      con acceso a `Reflector`, `JwtService` y `ConfigService`.
- [x] Marcar la ruta raíz de `backend/src/app.controller.ts` con `@Public()`.
- [x] Verificar que Swagger `/api/v1/docs` (healthcheck de Railway) sigue accesible
      (se sirve como middleware, fuera del pipeline de guards) — confirmarlo.

**Archivos:** crear `backend/src/common/guards/auth.guard.ts`,
`backend/src/common/decorators/public.decorator.ts` (y opcional
`current-user.decorator.ts`) · editar `backend/src/app.module.ts`,
`backend/src/app.controller.ts` ✅ **COMPLETADA**

### Fase 3 — Backend: cookies, CORS, throttler y variables de entorno

- [x] Editar `backend/src/main.ts`: registrar `app.use(cookieParser())` y añadir
      `credentials: true` (con origen explícito desde `FRONTEND_URL`) en `enableCors`.
- [x] Configurar `ThrottlerModule` (global o específico) y aplicar el límite al
      endpoint `POST /auth/login` (p.ej. 5–10 intentos/min → `429` al superar).
- [x] Ampliar el `validationSchema` de Joi en `backend/src/app.module.ts` con:
      `AUTH_EMAIL` (req.), `AUTH_PASSWORD_HASH` (req.), `JWT_SECRET` (req.),
      `JWT_EXPIRES_IN` (default `30d`), `MCP_API_KEY` (req.).
- [x] Documentar un procedimiento (script `node` de un solo uso, **no commiteado con
      valores reales**) para generar el hash bcrypt de la contraseña y poblar
      `AUTH_PASSWORD_HASH`.
- [x] Añadir las nuevas variables (sin valores reales) a la tabla de `.env` en
      `backend/CLAUDE.md` y en el `CLAUDE.md` raíz. Corregir de paso el puerto de dev
      a 3000 en la documentación desactualizada.
- [x] Registrar las variables en `.env` local y `.env.docker` (valores reales, nunca
      commiteados) y dejarlas listas para Railway en el despliegue.

**Archivos:** editar `backend/src/main.ts`, `backend/src/app.module.ts`,
`backend/CLAUDE.md`, `CLAUDE.md` (raíz) · configurar `.env` y `.env.docker` (no versionados) ✅ **COMPLETADA**

### Fase 4 — Frontend: cliente HTTP, servicio y hooks de auth

- [x] Editar `frontend/src/lib/api-client.ts`: añadir `withCredentials: true`; en el
      interceptor de respuesta, ante `401` redirigir a `/login` (evitando bucles: no
      redirigir cuando la petición sea a `/auth/me` o `/auth/login`).
- [x] Crear `frontend/src/services/auth.service.ts`: `login(dto)`, `logout()`,
      `getMe()` (patrón de servicios existentes, extrayendo `.data.data`).
- [x] Crear `frontend/src/hooks/useAuth.ts`: `useMe` (`useQuery`, key
      `['auth','me']`), `useLogin` y `useLogout` (`useMutation`; en `onSuccess` de
      logout, limpiar `['auth','me']` y la caché de React Query).
- [x] Añadir a `frontend/src/types/index.ts`: `LoginDto` (`email`, `password`) y
      `AuthUser` (shape de `/auth/me`), coincidiendo con el backend.

**Archivos:** editar `frontend/src/lib/api-client.ts`, `frontend/src/types/index.ts`
· crear `frontend/src/services/auth.service.ts`, `frontend/src/hooks/useAuth.ts` ✅ **COMPLETADA**

### Fase 5 — Frontend: pantalla de login, guard de rutas y logout

- [x] Leer `frontend/DESIGN.md` antes de escribir UI.
- [x] Crear `frontend/src/pages/Login.tsx`: formulario correo + contraseña
      (RHF + `zodResolver`), estados de carga/error, mensaje genérico ante
      credenciales inválidas, estilos con tokens del sistema de diseño y dark mode.
- [x] Crear `frontend/src/components/auth/ProtectedRoute.tsx`: usa `useMe`; mientras
      carga muestra estado de carga; si hay error/`401` redirige a `/login`; si hay
      sesión renderiza `<Outlet />`.
- [x] Editar `frontend/src/App.tsx`: añadir ruta pública `/login` (fuera de
      `MainLayout`) y envolver el árbol de rutas de `MainLayout` con `ProtectedRoute`.
- [x] Editar `frontend/src/components/layout/Sidebar.tsx` (y opcionalmente
      `Tabbar.tsx`): acción de cerrar sesión que invoque `useLogout` y redirija a
      `/login`.

**Archivos:** crear `frontend/src/pages/Login.tsx`,
`frontend/src/components/auth/ProtectedRoute.tsx` · editar `frontend/src/App.tsx`,
`frontend/src/components/layout/Sidebar.tsx` (opcional `Tabbar.tsx`) ✅ **COMPLETADA**

### Fase 6 — MCP: actualizar `todo-api` (autenticación por API key)

> Ejecutada por `@mcp-builder` de `backend/.agents/`. Antes de la fase de pruebas
> para que `@tester` valide también el acceso autenticado al MCP.

- [ ] Confirmar que la validación de `MCP_API_KEY` en `auth.guard.ts` (Fase 2) cubre
      `POST`, `GET` y `DELETE` de `/mcp`, incluido el flujo `@Res()`/SSE.
- [ ] Actualizar `docs/mcps/README.md`: documentar que `/mcp` ahora requiere
      `Authorization: Bearer <MCP_API_KEY>` y registrar la variable `MCP_API_KEY`.
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md` y
      `docs/mcps/finanzas-personales.system-prompt.md`: sección de
      conexión/autenticación indicando el header requerido y que es independiente
      del login de usuario.
- [ ] Verificar que el MCP responde correctamente **con** la API key y devuelve
      `401` **sin** ella (sin romper las tools declaradas).

**Archivos:** editar `docs/mcps/README.md`,
`docs/mcps/asistente-personal.system-prompt.md`,
`docs/mcps/finanzas-personales.system-prompt.md`.

### Fase 7 — Pruebas

- [ ] Crear `docs/testing/test-021-login-seguro-usuario-unico.md` con casos manuales
      de UI (incluyendo casos `TC-MCP-NNN` para el acceso autenticado al MCP).
- [ ] Cambiar el estado del spec a `[TESTING]`.
- [ ] El usuario ejecuta los casos manuales; Claude los marca conforme pasan.
- [ ] Invocar `@tester` para las pruebas e2e definidas abajo.
- [ ] Al aprobar todo, marcar el spec como `[DONE]`.

## Criterios de aceptación

- El usuario puede iniciar sesión en `/login` con credenciales correctas y es
  redirigido a la app.
- Con credenciales incorrectas, recibe un mensaje genérico ("Credenciales
  inválidas") y no accede.
- Sin sesión válida, cualquier ruta protegida del frontend redirige a `/login`.
- Toda petición REST bajo `/api/v1` (excepto `POST /auth/login`, `POST /auth/logout`
  y healthcheck/docs) responde `401` sin cookie de sesión válida.
- La cookie de sesión es `httpOnly`, con `SameSite` y `Secure` en producción, y
  expira acorde a `JWT_EXPIRES_IN` (30 días).
- `GET /auth/me` devuelve el usuario con sesión y `401` sin ella.
- `POST /auth/logout` limpia la cookie y deja las rutas protegidas inaccesibles.
- Al recibir `401` en cualquier llamada, el frontend redirige a `/login` sin bucle.
- El endpoint `/mcp` responde correctamente **solo** con
  `Authorization: Bearer <MCP_API_KEY>` válido; sin él o con token inválido, `401`.
- Las credenciales de contraseña nunca se almacenan ni transmiten en claro en disco
  (solo el hash bcrypt vive en `.env`).
- El endpoint de login limita intentos repetidos y responde `429` al superar el
  umbral (throttler).
- Los system prompts de `docs/mcps/` y el `README.md` reflejan el requisito de API key.

## Pruebas e2e (si aplica)

Casos a automatizar por `@tester` en `backend/test/` (`jest-e2e.json`):

- `POST /auth/login` con credenciales válidas → `200/201`, `Set-Cookie` con flags
  correctos (`HttpOnly`, `SameSite`, `Secure` en prod).
- `POST /auth/login` con email o contraseña inválidos → `401` con mensaje genérico.
- `GET /auth/me` sin cookie → `401`; con cookie válida → `200` con el usuario.
- `GET /api/v1/projects` sin cookie → `401`; con cookie válida → `200`.
- `POST /auth/logout` → limpia cookie; petición protegida posterior → `401`.
- `POST /mcp` sin header de API key → `401`; con `MCP_API_KEY` válida → responde el
  JSON-RPC de una tool (p.ej. `list_projects`).
- Múltiples `POST /auth/login` fallidos consecutivos → `429` (throttler).

---

## Dependencias nuevas (aprobadas por el usuario)

**Backend:**
- `@nestjs/jwt` — firma y verificación del JWT.
- `bcryptjs` (+ `@types/bcryptjs` en dev) — comparación de contraseña (JS puro).
- `cookie-parser` (+ `@types/cookie-parser` en dev) — lectura de la cookie de sesión.
- `@nestjs/throttler` — rate limiting del endpoint de login.

**Frontend:** ninguna (`react-hook-form`, `@hookform/resolvers`, `zod`, `axios` ya
están instalados).
