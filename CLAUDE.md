# CLAUDE.md — ToDo

> Este archivo es la fuente de verdad para Claude Code en este proyecto.
> Léelo completo antes de ejecutar cualquier acción.

---

## Inicialización de sesión

Antes de cualquier tarea, Claude debe ejecutar estos pasos en orden:

1. Leer este archivo completo.
2. Leer `DESIGN.md` si la tarea involucra UI.
3. Listar los specs activos (`[IN PROGRESS]` o `[TESTING]`) en `spec/`.
4. Confirmar el repositorio activo y la rama actual con `git status`.
5. Si hay contexto previo relevante (spec en curso, decisión de arquitectura,
   deuda técnica pendiente), pedirlo al usuario antes de proceder.

---

## Reglas generales

- Toda la comunicación con el usuario debe ser en español.
- Antes de editar cualquier archivo, leer las secciones relevantes de su contenido.
  Para archivos de más de 300 líneas, navegar por secciones antes de editar;
  no asumir estructura sin haberla leído.
- No adivines rutas, imports ni nombres de variables: confírmalos leyendo el código.
- Si tienes dudas bloqueantes, usa `AskUserQuestion` antes de proceder.
- Nunca interrumpas una tarea a mitad para pedir confirmación, salvo que el
  riesgo de continuar sea alto (borrado de datos, cambios en producción, etc.).
- Prefiere cambios quirúrgicos sobre refactors amplios no solicitados.
- Para cualquier tarea que involucre UI, leer `DESIGN.md` antes de escribir código.

---

## Agentes especializados

Las instrucciones de cada subagente viven **dentro de la carpeta de cada
proyecto**, no en la raíz: `backend/.agents/` y `frontend/.agents/`. Leer el
archivo del agente correspondiente al repositorio activo antes de invocarlo.
No improvisar su comportamiento.

| Agente        | Cuándo invocarlo                                                              |
|---------------|---------------------------------------------------------------------------------|
| `@architect`  | Diseño de specs: fases, archivos impactados, sin código                       |
| `@reviewer`   | Revisión de código antes de marcar un spec como `[DONE]`                     |
| `@tester`     | Generación y ejecución de casos de prueba e2e / manuales                      |
| `@mcp-builder`| Evaluación, diseño, creación y actualización de MCPs y sus system prompts     |

> El único MCP real del proyecto vive en `backend/` (`src/mcp/mcp.service.ts`),
> por lo que `@mcp-builder` de `backend/.agents/` es quien aplica los cambios;
> el de `frontend/.agents/` solo coordina cuando un cambio de UI implica
> actualizar un system prompt.
> Si en alguna de esas carpetas existen agentes adicionales específicos del
> subproyecto, tienen precedencia sobre la tabla anterior.

---

## Contexto del proyecto

App personal de gestión de actividades, proyectos y finanzas personales.
Permite crear, organizar y hacer seguimiento de tareas con atributos como
prioridad, energía, tipo, fechas, subtareas y recurrencia, así como registrar
gastos, ingresos, cuentas, tarjetas de crédito, CDTs, presupuestos, deudas y
una lista de deseos. Incluye un servidor MCP (`todo-api`) para integración
con asistentes de IA — ver `docs/mcps/README.md`.
Estado actual: MVP en desarrollo activo.

---

## Repositorios del ecosistema

Este proyecto es un **monorepo** (no un ecosistema multi-repo): backend y
frontend viven en el mismo repositorio Git, cada uno con su propio
`CLAUDE.md` técnico.

```
01-ToDo/
├── backend/    # API REST + servidor MCP — NestJS 11 + PostgreSQL 16
└── frontend/   # SPA — React 19 + Vite + TypeScript
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 (staleTime: 1min, retry: 1) |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios |
| Estilos | Tailwind CSS 4 (vía `@tailwindcss/vite`) |
| Backend | NestJS 11 + TypeScript 5.7 |
| ORM | TypeORM + PostgreSQL 16 |
| MCP | `@modelcontextprotocol/sdk` (JSON-RPC + SSE en `/mcp`) |
| Base de datos | PostgreSQL 16 (Docker, puerto 5433, db: `todo_db`) |

### Comandos

```bash
# Base de datos (Docker)
docker compose up -d

# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev

# Build producción
cd backend && npm run build
cd frontend && npm run build

# Tests (backend)
cd backend && npm run test
cd backend && npm run test:e2e

# Linter / Formatter
cd backend && npm run lint && npm run format
cd frontend && npm run lint
```

---

## Dependencias

- Package manager: `npm` — no mezclar managers en el mismo proyecto.
- Antes de instalar cualquier dependencia nueva:
  1. Verificar si ya existe algo equivalente en `package.json`.
  2. Mencionarlo al usuario con justificación clara (qué resuelve, por qué esa librería).
  3. Esperar confirmación explícita.
- Preferir dependencias con mantenimiento activo y bajo footprint.
- Nunca instalar dependencias de desarrollo en `dependencies` ni al revés.

---

## Variables de entorno

- Archivo backend: `.env` (raíz del repo) — nunca commitear.
- Archivo backend (Docker): `.env.docker` — nunca commitear.
- Archivo frontend: `frontend/.env.local` — nunca commitear.

| Variable | Archivo | Descripción |
|----------|---------|-------------|
| `DB_HOST` | `.env` | Host de PostgreSQL (`localhost` en dev) |
| `DB_PORT` | `.env` | Puerto PostgreSQL (5433) |
| `DB_NAME` | `.env` | Nombre de la base de datos (`todo_db`) |
| `DB_USER` | `.env` | Usuario de la base de datos |
| `DB_PASSWORD` | `.env` | Contraseña de la base de datos |
| `NODE_ENV` | `.env` | `development \| production \| test` |
| `FRONTEND_URL` | `.env` | URL del frontend para CORS |
| `VITE_API_URL` | `frontend/.env.local` | URL base de la API (`http://localhost:3002/api/v1`) |

> ⚠️ Nunca escribas valores reales de variables de entorno en este archivo
> ni en ningún archivo rastreado por git.

---

## Base de datos

- Motor: PostgreSQL 16 en Docker (puerto 5433).
- ORM: TypeORM con **`synchronize: false` siempre** (dev y producción) — este
  proyecto no usa `synchronize: true` en ningún entorno, a diferencia de otros
  proyectos del stack. Todo cambio de esquema requiere una migración explícita.
- Nunca ejecutar migraciones en entornos distintos al local sin confirmación explícita.
- CLI de migraciones: configurado en `backend/src/data-source.ts`.

---

## Backend y/o APIs

API REST propia (NestJS), sin dependencias de APIs externas de terceros.

- Framework: NestJS 11 con prefijo global `/api/v1`.
- Respuestas envueltas por `TransformInterceptor`: `{ statusCode, message, data }`.
- Errores formateados por `HttpExceptionFilter`.
- Validación con `ValidationPipe` (whitelist + transform).
- CORS habilitado para `FRONTEND_URL` (`.env`).
- Swagger disponible en desarrollo (`/api/v1/docs`).
- Autenticación: **no implementada** — la app es de uso personal, un solo usuario.

- Base URL desarrollo: `http://localhost:3002/api/v1`
- Base URL producción: `{{url de producción del backend}}`

| Método | Ruta                    | Descripción                      |
|--------|-------------------------|----------------------------------|
| GET/POST/PATCH/DELETE | `/projects` | CRUD de proyectos |
| GET/POST/PATCH/DELETE | `/activities` | CRUD de actividades, subtareas y plantillas recurrentes |
| GET/POST/PATCH/DELETE | `/expenses`, `/incomes`, `/purchases`, `/accounts`, `/credit-cards`, `/cdts`, `/budgets`, `/debts` | CRUD estándar por recurso financiero |

> Detalle completo de rutas, entidades, lógica de negocio y tools MCP: ver
> `backend/CLAUDE.md`.

---

## Arquitectura y patrones internos

### Backend (`backend/src/`)

```
src/
├── activities/      # Actividades, subtareas y recurrencia (controller, service, entity, DTOs, cron)
├── projects/        # Módulo de proyectos (controller, service, entity, DTOs)
├── finances/        # Gastos, ingresos, compras, cuentas, tarjetas, CDTs, presupuestos, deudas
├── mcp/             # Servidor MCP (tools para integración con IA)
├── common/          # Interceptors, filtros, pipes y enums globales
├── main.ts          # Bootstrap, CORS, pipes globales
├── app.module.ts    # Módulo raíz
└── data-source.ts   # Config TypeORM / CLI de migraciones
```

### Frontend (`frontend/src/`)

```
src/
├── components/      # Componentes reutilizables (sin lógica de negocio) + components/finances/
├── pages/           # Vistas/páginas por ruta + pages/finances/
├── hooks/           # Custom hooks (React Query) + hooks/finances/
├── services/        # Llamadas HTTP puras (sin React) + services/finances/
├── lib/             # API client (Axios) y utilidades
└── types/           # Tipos e interfaces TypeScript globales (index.ts)
```

- Patrón de estado: TanStack React Query v5
- Patrón de fetch: servicios async puros en `services/`, envueltos en hooks en `hooks/`
- Mutations invalidan query keys relevantes en `onSuccess`

### Entidades del dominio

**Project**
`id` · `name` · `status` (ACTIVE | INACTIVE | PAUSED | COMPLETED) · `startDate` · `endDate`

**Activity**
`id` · `name` · `description` · `project?` · `parent?` · `subtasks[]`
`status` (PENDING | IN_PROGRESS | COMPLETED | CANCELLED | ON_HOLD)
`priority` (HIGH | MEDIUM | LOW) · `energy` (HIGH | MEDIUM | LOW)
`type` (TASK | REMINDER) · `dueDate` (fecha límite en task, fecha+hora en reminder)
`scheduledForToday` · `notionUrl`
`isRecurring` · `isTemplate` · `recurrenceFrequency` · `recurrenceDays` ·
`recurrenceDayOfMonth` · `recurrenceEndDate` · `instanceDate` · `templateId`

> No existe el tipo `EVENT` ni los campos `device`, `actionDate`, `duration`,
> `durationUnit` ni `location` — fueron eliminados del modelo (ver
> `backend/CLAUDE.md` para el detalle completo de la entidad).

**Finanzas** (módulo `finances/`) — detalle completo en `backend/CLAUDE.md`:
`Expense`, `Income`, `Purchase`, `Account`, `CreditCard`, `Cdt`,
`Budget`/`BudgetItem`, `Debt`.

---

## MCPs del proyecto

Los MCPs (Model Context Protocol) son servidores que exponen herramientas y
recursos del proyecto a agentes de IA. Centralizar su gestión permite que
tanto Claude Code como otros agentes accedan a datos y acciones del sistema
de forma consistente y trazable.

### Estructura de carpetas

```
docs/
└── mcps/
    ├── README.md                                     # Índice de MCPs activos y su propósito
    ├── asistente-personal.system-prompt.md           # Agente de productividad (proyectos, actividades, Calendar)
    └── finanzas-personales.system-prompt.md          # Agente de finanzas personales
```

### Inventario de MCPs

> Mantener este inventario actualizado en `docs/mcps/README.md`. Resumen:

| MCP | Propósito | Estado | System prompt |
|-----|-----------|--------|----------------|
| `todo-api` | Expone proyectos, actividades y el dominio financiero completo vía JSON-RPC en `/mcp` | Activo | `asistente-personal.system-prompt.md` (productividad) · `finanzas-personales.system-prompt.md` (finanzas) |

### Reglas de gestión de MCPs

- Antes de implementar cualquier spec, evaluar si la funcionalidad nueva
  expone datos o acciones que un agente podría necesitar → candidato a MCP.
- Si ya existe un MCP relacionado (`todo-api`), evaluar si requiere nuevas
  herramientas en `mcp.service.ts` en lugar de crear uno nuevo.
- Todo MCP nuevo o modificado debe actualizarse en `docs/mcps/README.md`.
- El system prompt afectado en `docs/mcps/` debe reflejar las capacidades
  actuales del MCP tras cada cambio (tools, campos, reglas de negocio).
- Los system prompts deben ser precisos: describir qué puede hacer el agente,
  qué herramientas tiene disponibles, sus límites y el tono esperado.
- Nunca eliminar un MCP o una tool sin confirmar con el usuario que ningún
  agente activo la consume.

### Estructura mínima de un system prompt (`docs/mcps/`)

```md
# System prompt — {{Nombre del agente}}

## Rol y propósito
Descripción del agente: qué es, para quién trabaja y cuál es su objetivo.

## MCP(s) disponibles
- `todo-api`: {{qué herramientas expone y para qué sirven}}

## Capacidades
- {{Acción concreta que puede realizar}}
- {{Acción concreta que puede realizar}}

## Restricciones
- {{Qué NO puede o NO debe hacer}}
- {{Límites de acceso a datos}}

## Tono y formato de respuesta
{{Instrucciones de estilo: formal/informal, idioma, longitud de respuestas, etc.}}
```

---

## Convenciones de código

- Lenguaje: **TypeScript estricto** (`strict: true`).
- Nombres de archivos: `PascalCase` para componentes React, `camelCase` para hooks/services.
- Nombres de funciones y variables: `camelCase`.
- Exportaciones: preferir **named exports**; default export solo para componentes de página.
- Estilos: Tailwind CSS 4 con tokens semánticos definidos en `index.css`.
- No usar `any` salvo que sea absolutamente inevitable; documentarlo con `// TODO: type this`.
- Tipos centralizados en `frontend/src/types/index.ts`.
- API client en `frontend/src/lib/api-client.ts` (interceptor extrae mensaje de error).

---

## Testing

- Framework backend: Jest (`*.spec.ts`).
- Ubicación de tests backend: junto al módulo (`src/**/*.spec.ts`).
- Tests e2e backend: `backend/test/` con configuración `jest-e2e.json`.
- No hay tests automatizados en frontend actualmente — validación por casos
  manuales en `docs/testing/`.
- Antes de cerrar una tarea con lógica crítica en el backend, verificar que existe
  al menos un test que cubra el caso feliz.
- Si el spec incluyó una fase de MCP, agregar casos `TC-MCP-NNN` en el
  `test-NNN` correspondiente.
- No borrar ni modificar tests existentes sin instrucción explícita.
- Los tests e2e son responsabilidad de `@tester` y se ejecutan como última fase de
  cada spec antes del merge a `development`.

---

## Specs de funcionalidades

### Ubicación y nomenclatura

- Carpeta: `spec/` en el directorio raíz del proyecto.
- Nomenclatura: `spec-{{NNN}}-{{slug-descriptivo}}.md`
  (NNN = correlativo con cero a la izquierda, ej. `spec-020-offline-sync.md`)
- Consultar specs anteriores antes de nombrar uno nuevo para evitar solapamiento.

### Estados válidos

| Estado         | Significado                                              |
|----------------|----------------------------------------------------------|
| `[IN PROGRESS]`| Implementación iniciada                                  |
| `[TESTING]`    | Implementación completa, pendiente de pruebas manuales/e2e |
| `[DONE]`       | Pruebas superadas, listo para merge a `development`      |

- Los specs completados **no se borran**; se marcan con `[DONE]` en el título.
- Solo specs en estado `[DONE]` con su archivo `test-NNN` correspondiente
  pueden hacer merge a `development`.

### Estructura mínima de un spec

```md
# spec-NNN — [Estado] Título descriptivo

## Contexto
Por qué se necesita esta funcionalidad y qué problema resuelve.

## Alcance
Qué incluye y qué **no** incluye este spec.

## Impacto en el sistema
Componentes, rutas, modelos o servicios afectados.

## Evaluación MCP
> Completar esta sección antes de iniciar la implementación.

**¿Aplica MCP?** Sí / No

Si aplica, describir:
- **MCP existente a modificar:** `todo-api` — herramientas a agregar/cambiar.
- **MCP nuevo a crear:** `{{nombre-mcp}}` — propósito y herramientas que expondrá.
- **System prompt afectado:** `docs/mcps/{{nombre}}.system-prompt.md`
- **Fase de MCP en este spec:** Fase {{N}}

Si no aplica, justificar brevemente por qué esta funcionalidad
no requiere exponer herramientas o datos a agentes.

## Fases de implementación

### Fase 1 — Nombre
- [ ] Paso concreto
- [ ] Paso concreto

### Fase N — MCP: {{crear / actualizar}} `todo-api`
> Incluir esta fase solo si "Evaluación MCP" indica que aplica.
- [ ] {{Agregar herramienta al MCP existente / crear una nueva}}
- [ ] Registrar o actualizar entrada en `docs/mcps/README.md`
- [ ] Crear o actualizar `docs/mcps/{{nombre}}.system-prompt.md`
- [ ] Verificar que el MCP responde correctamente a las herramientas declaradas

### Fase N+1 — Nombre
- [ ] Paso concreto

## Criterios de aceptación
- El usuario puede hacer X.
- El sistema responde con Y ante Z.
- (Si aplica MCP) El agente puede invocar `{{herramienta}}` y obtener `{{resultado esperado}}`.

## Pruebas e2e (si aplica)
Descripción de los casos a automatizar en la última fase, ejecutados por @tester.
```

---

## Nuevas funcionalidades

### Antes de implementar

1. Analizar el impacto del feature en todos los componentes del proyecto.
2. Usar el subagente `@architect` (de `backend/.agents/` o `frontend/.agents/`
   según corresponda) para crear el plan de implementación:
   - Solo descripción de fases, pasos y archivos a editar.
   - Sin código.
3. **Evaluar si aplica MCP** (ver criterios en la sección siguiente).
   Si aplica, invocar `@mcp-builder` (de `backend/.agents/`) para diseñar la
   fase de MCP dentro del spec.
4. Guardar el plan en `spec/` con la nomenclatura definida.
5. Esperar aprobación del usuario antes de escribir código.
6. Crear una rama nueva desde `development` siguiendo las reglas de git.

### Criterios para evaluar si una funcionalidad requiere MCP

Responder estas preguntas antes de diseñar el spec:

| Pregunta                                                                 | Si la respuesta es "sí"…                          |
|--------------------------------------------------------------------------|---------------------------------------------------|
| ¿La funcionalidad expone datos que un agente podría necesitar consultar? | Candidato a herramienta de lectura en `todo-api`  |
| ¿La funcionalidad permite acciones que un agente debería poder ejecutar? | Candidato a herramienta de escritura/acción en `todo-api` |
| ¿Ya existe una tool en `todo-api` que cubre un dominio relacionado?      | Evaluar si extenderla en lugar de crear una nueva |
| ¿Hay un system prompt en `docs/mcps/` que se beneficiaría del cambio?   | Debe actualizarse obligatoriamente                 |

> Si ninguna respuesta es afirmativa, documentar la justificación en
> la sección "Evaluación MCP" del spec y continuar sin fase de MCP.

### Durante la implementación

- Trabajar fase por fase según el spec; no saltarse pasos.
- Al iniciar la Fase 1 de cualquier spec, cambiar su estado a `[IN PROGRESS]`.
- Al completar cada fase, documentarla como completada en el propio spec.
- La fase de MCP debe ejecutarse antes de la fase de pruebas e2e,
  para que `@tester` pueda validar también las herramientas expuestas.
- Si el scope del spec debe cambiar (nuevo hallazgo, bloqueante estructural),
  proponer la modificación al usuario **antes** de proceder. No editar el spec
  unilateralmente ni implementar fuera de él.
- Si se descubre deuda técnica fuera del scope, documentarla con un comentario
  `// DEBT:` en el código y registrarla en `spec/backlog.md`, sin actuar
  sobre ella en la tarea actual.
- Si aparece un bloqueante no previsto en el spec, reportarlo antes de improvisar.
- No modificar archivos fuera del alcance del spec sin avisar.

### Después de terminar la implementación

1. Crear el archivo de pruebas manuales en `docs/testing/` con la nomenclatura
   `test-{{NNN}}-{{slug-descriptivo}}.md` (mismos NNN y slug que el spec).
2. Cambiar el estado del spec a `[TESTING]`.
3. El usuario ejecutará los casos manualmente e indicará cuáles pasan.
   Claude marcará cada caso como completado en el archivo de test.
4. Cuando todos los casos estén aprobados, invocar `@tester` para ejecutar
   las pruebas e2e definidas en el spec (si aplica).
5. Al superar todas las pruebas, marcar el spec como `[DONE]`.

### Pruebas manuales — estructura del archivo

- Todos los archivos `test-NNN` van en `docs/testing/` en el directorio raíz.
- Solo incluir casos manuales de proyectos con UI (mobile o web). Los endpoints
  se validan con pruebas e2e desde el propio spec.
- Si el spec incluyó una fase de MCP, agregar casos de prueba específicos
  para las herramientas creadas o modificadas (prefijo `TC-MCP-NNN`).
- Cada caso de prueba debe tener un código identificador único (`TC-001`, `TC-002`…).

```md
# test-NNN — Título descriptivo

## Casos de prueba

### TC-001 — Nombre del caso
**Precondición:** ...
**Pasos:**
1. ...
2. ...
**Resultado esperado:** ...
**Estado:** ⬜ Pendiente / ✅ Aprobado / ❌ Fallido

### TC-MCP-001 — Nombre del caso MCP (si aplica)
**Herramienta probada:** `{{nombre-herramienta}}` en `todo-api`
**Precondición:** ...
**Input de prueba:** ...
**Output esperado:** ...
**Estado:** ⬜ Pendiente / ✅ Aprobado / ❌ Fallido
```

---

## Despliegue

> ⚠️ Ningún paso de esta sección debe ejecutarse sin confirmación explícita
> del usuario en la misma sesión. El despliegue siempre lo inicia el usuario;
> Claude puede asistir en la preparación y verificación.

### Infraestructura

#### Base de datos

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| Proveedor          | `{{proveedor de BD en producción — no confirmado; en local es PostgreSQL 16 vía docker-compose.yml}}` |
| Proyecto / Cluster | `{{nombre del proyecto en el proveedor}}`  |
| Base de datos      | `todo_db`                                  |
| Región             | `{{región de producción}}`                 |
| Variable de conexión | `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` en `.env` |
| Panel de control   | `{{url del dashboard del proveedor}}`      |

#### Backend

| Campo            | Valor                                          |
|------------------|--------------------------------------------------|
| Proveedor        | `Railway` (confirmado: `backend/railway.toml`, build vía Dockerfile) |
| Proyecto         | `{{nombre del proyecto en Railway}}`           |
| Servicio         | `{{nombre del servicio}}`                      |
| Entorno          | `production`                                   |
| Healthcheck      | `/api/v1/docs` (definido en `railway.toml`)    |
| URL producción   | `{{url del servicio desplegado}}`              |
| Deploy trigger   | `{{push a main / deploy automático / manual}}` |
| Panel de control | `https://railway.app/project/{{project-id}}`   |

#### Frontend

| Campo            | Valor                                          |
|------------------|--------------------------------------------------|
| Proveedor        | `Vercel` (confirmado: `frontend/vercel.json`, rewrites de SPA) |
| Proyecto         | `{{nombre del proyecto en Vercel}}`            |
| Rama de producción | `main`                                       |
| URL producción   | `{{url del proyecto desplegado}}`              |
| Deploy trigger   | `{{push a main / deploy automático / manual}}` |
| Panel de control | `https://vercel.com/{{equipo}}/{{proyecto}}`   |

> Existe una rama `deploy/vercel` en el historial de git — confirmar con el
> usuario si sigue siendo el flujo vigente antes de asumir el nombre de rama
> de despliegue para el frontend.

---

### Checklist pre-despliegue

Ejecutar este checklist **antes de iniciar cualquier despliegue**:

- [ ] Todos los specs afectados están en estado `[DONE]`.
- [ ] La rama `development` tiene todos los merges requeridos.
- [ ] Las variables de entorno de producción están actualizadas en el proveedor
      (Railway / Vercel / proveedor de BD) — **no en archivos locales**.
- [ ] Si hay cambios de esquema, la migración TypeORM está preparada y revisada.
- [ ] El build local pasa sin errores (`npm run build` en `backend/` y `frontend/`).
- [ ] Los tests del backend pasan (`npm run test` y `npm run test:e2e`).
- [ ] Se creó la rama `deploy/{{versión-o-descripción}}` desde `development`.

---

### Proceso de despliegue — Backend (Railway)

```
development ──merge──▶ deploy/vX.Y.Z ──merge──▶ main ──push──▶ Railway (auto-deploy)
```

#### Paso a paso

1. **Preparar rama de despliegue**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b deploy/{{versión}}
   ```

2. **Ejecutar migraciones** *(solo si hay cambios de esquema)*
   > ⚠️ Requiere confirmación explícita del usuario antes de ejecutar.
   ```bash
   npx typeorm migration:run -d src/data-source.ts
   ```
   Verificar en el panel de la base de datos que la migración aplicó correctamente
   antes de continuar.

3. **Merge a `main`**
   > ⚠️ Requiere confirmación explícita del usuario.
   ```bash
   git checkout main
   git pull origin main
   git merge deploy/{{versión}} --no-ff -m "deploy: release {{versión}}"
   ```

4. **Push a `main`**
   > ⚠️ Requiere confirmación explícita del usuario.
   ```bash
   git push origin main
   ```
   Railway detecta el push y lanza el pipeline de build automáticamente
   (si está configurado el auto-deploy). Si es deploy manual, iniciarlo
   desde el panel: `{{url del panel}}`.

5. **Verificar el despliegue en Railway**
   - Confirmar que el build terminó sin errores en el panel de Railway.
   - Verificar los logs de inicio del servicio.
   - Hacer una petición al healthcheck: `{{url}}/api/v1/docs`.

6. **Limpiar ramas**
   ```bash
   git branch -d deploy/{{versión}}
   git push origin --delete deploy/{{versión}}
   ```

---

### Proceso de despliegue — Frontend (Vercel)

```
development ──merge──▶ deploy/vX.Y.Z ──merge──▶ main ──push──▶ Vercel (auto-deploy)
```

#### Paso a paso

1. **Preparar rama de despliegue**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b deploy/{{versión}}
   ```

2. **Verificar variables de entorno en Vercel**
   - Acceder a `Settings → Environment Variables` en el panel de Vercel.
   - Confirmar que `VITE_API_URL` apunta a la URL de producción del backend
     (no a `localhost`).

3. **Merge a `main`**
   > ⚠️ Requiere confirmación explícita del usuario.
   ```bash
   git checkout main
   git pull origin main
   git merge deploy/{{versión}} --no-ff -m "deploy: release {{versión}}"
   ```

4. **Push a `main`**
   > ⚠️ Requiere confirmación explícita del usuario.
   ```bash
   git push origin main
   ```
   Vercel detecta el push y lanza el build automáticamente.
   Si es deploy manual, ejecutar:
   ```bash
   npx vercel --prod
   ```

5. **Verificar el despliegue en Vercel**
   - Confirmar que el build terminó sin errores en el panel de Vercel
     (`Deployments → último deployment`).
   - Navegar a `{{url de producción}}` y verificar que la aplicación
     carga correctamente.
   - Revisar la consola del navegador en busca de errores críticos.

6. **Limpiar ramas**
   ```bash
   git branch -d deploy/{{versión}}
   git push origin --delete deploy/{{versión}}
   ```

---

### Rollback de emergencia

Si el despliegue produce errores críticos en producción:

#### Backend — Railway
1. Acceder al panel de Railway → servicio afectado → `Deployments`.
2. Seleccionar el deployment anterior (el último exitoso).
3. Hacer clic en `Redeploy` sobre ese deployment.
4. Si el rollback involucra revertir migraciones de base de datos,
   **detener el proceso y escalar al usuario** — el rollback de esquema
   debe planificarse manualmente.

#### Frontend — Vercel
1. Acceder al panel de Vercel → proyecto → `Deployments`.
2. Localizar el último deployment exitoso.
3. Hacer clic en `···` → `Promote to Production`.
4. Vercel redirige el tráfico al deployment anterior en segundos.

#### Base de datos
> No existe rollback automático para migraciones de esquema TypeORM.
> Si la migración causó pérdida o corrupción de datos, escalar
> inmediatamente al usuario con el detalle del error antes de
> ejecutar cualquier acción.

---

### Acciones prohibidas en despliegue

Además de las acciones prohibidas generales, durante el proceso de despliegue
Claude **nunca** debe:

- Ejecutar migraciones en producción sin confirmación explícita del usuario
  en esa misma sesión, incluso si forman parte del checklist.
- Hacer `push` a `main` sin que el usuario haya aprobado el merge previamente.
- Modificar variables de entorno directamente en Railway, Vercel o cualquier
  proveedor de base de datos.
- Ejecutar un rollback de base de datos sin escalar al usuario primero.
- Crear o eliminar bases de datos, proyectos o servicios en cualquier proveedor.

---

## Acciones prohibidas

> Claude nunca debe realizar las siguientes acciones sin confirmación explícita
> del usuario en esa misma sesión:

- Borrar archivos o carpetas (salvo temporales generados por la propia tarea).
- Ejecutar migraciones de base de datos en entornos distintos al local.
- Hacer push a `main` o `development` directamente.
- Modificar variables de entorno de producción.
- Instalar dependencias nuevas sin mencionarlo y esperar confirmación.
- Hacer commit de archivos `.env*` reales.
- Editar el spec activo para ampliar su scope sin aprobación del usuario.
- Eliminar o reemplazar un MCP activo sin confirmar que ningún agente lo consume.
- Modificar un system prompt en `docs/mcps/` fuera de una fase de MCP
  aprobada en el spec correspondiente.

---

## Git — Branching & Commits

### Estructura de ramas

| Propósito                         | Prefijo     | Ejemplo                          |
|-----------------------------------|-------------|-----------------------------------|
| Nueva funcionalidad o spec        | `feature/`  | `feature/activity-filters`       |
| Corrección de bug                 | `bug/`      | `bug/date-timezone-offset`       |
| Preparación de despliegue         | `deploy/`   | `deploy/v1.0.0`                  |

- `main` — producción; solo recibe merges desde `deploy/`.
- `development` — integración y pruebas; todas las ramas `feature/` y `bug/`
  se desprenden de aquí.
- Al mergear una rama a `development`, eliminarla inmediatamente.
- Los ajustes de despliegue van en `deploy/<nombre>` y se mergean a `main`.
- Solo se puede hacer merge a `development` de specs en estado `[DONE]` que
  cuenten con su archivo `test-NNN` aprobado.

### Commits

- Hacer commits cuando el volumen de cambios lo justifique; no commits triviales.
- Mensajes **completamente en inglés**, siguiendo
  [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

Tipos válidos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`,
`style`, `perf`, `ci`.

Ejemplos:
```
feat(activities): add inline quick-edit for name and priority
fix(api): correct timezone offset on actionDate filtering
chore(deps): upgrade typeorm to v0.3.21
docs(mcps): update finanzas-personales system prompt with debt tools
feat(mcp): add pay_debt_installment tool to todo-api MCP server
```
