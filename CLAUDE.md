# CLAUDE.md — ToDo

> Este archivo es la fuente de verdad para Claude Code en este proyecto.
> Léelo completo antes de ejecutar cualquier acción.

---

## Inicialización de sesión

Antes de cualquier tarea, Claude debe ejecutar estos pasos en orden:

1. Leer este archivo completo.
2. Leer `frontend/DESIGN.md` si la tarea involucra UI.
3. Revisar los subagentes disponibles en `/.claude/agents/` y las skills
   disponibles en `/.claude/skills/` para saber con qué capacidades cuenta
   antes de planificar la tarea.
4. Listar los specs de `spec/` agrupados por estado: activos
   (`[IN PROGRESS]` o `[TESTING]`) y pendientes de aprobación (`[NOT STARTED]`).
   Si algún spec no tiene estado en el título, marcarlo como `[NOT STARTED]`
   y reportarlo al usuario — excepto los specs heredados `00_...` a `12_...`,
   anteriores a la convención `spec-NNN`, que ya usan sus propios estados y se
   mantienen como registro histórico sin renombrar.
5. Confirmar el repositorio activo y la rama actual con `git status`.
6. Si hay contexto previo relevante (spec en curso, decisión de arquitectura,
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
- Para cualquier tarea que involucre UI, leer `frontend/DESIGN.md` antes de
  escribir código.
- **Nunca inicies la implementación de un spec sin confirmación explícita del
  usuario en esa misma sesión.** Redactar el spec y sus pruebas no autoriza a
  escribir el código: son pasos distintos y cada uno requiere su aprobación.
- **No abras ni controles el navegador** (navegación, automatización, capturas)
  salvo que el usuario lo solicite explícitamente. Ver "Pruebas visuales y uso
  del navegador".

---

## Agentes especializados

Este proyecto es un **monorepo**: backend y frontend viven en el mismo
repositorio, y los subagentes se comparten entre ambos desde una única
ubicación en la raíz: `/.claude/agents/`. Leer el archivo del agente antes de
invocarlo. No improvisar su comportamiento.

| Agente        | Cuándo invocarlo                                                              |
|---------------|---------------------------------------------------------------------------------|
| `@architect`  | Diseño de specs: fases, archivos impactados, sin código                       |
| `@reviewer`   | Revisión de código antes de marcar un spec como `[DONE]`                     |
| `@tester`     | Diseño de pruebas junto con el spec (test-first) y ejecución de las automáticas |
| `@mcp-builder`| Evaluación, diseño, creación y actualización de MCPs y sus system prompts     |

> El único MCP real del proyecto vive en `backend/` (`src/mcp/mcp.service.ts`),
> así que `@mcp-builder` es siempre quien aplica los cambios de servidor,
> tanto si el spec que los originó es de backend como de frontend.

---

## Skills

En `/.claude/skills/` viven las skills instaladas para el proyecto (paquetes
de buenas prácticas de terceros, no versionados — ver `.gitignore`). Cada
skill es una carpeta con su propio `SKILL.md`.

- Antes de ejecutar una tarea, revisar si alguna skill de `/.claude/skills/`
  cubre ese dominio y, si es así, leer su `SKILL.md` **completo** antes de
  escribir código o generar archivos. Varias skills pueden aplicar a una
  misma tarea.
- No asumir el contenido de una skill por su nombre: leerla siempre.
- Las skills describen cómo hacer las cosas en **este** proyecto; sus
  instrucciones tienen precedencia sobre suposiciones generales.
- Si una tarea recurrente carece de skill y valdría la pena documentarla,
  proponerlo al usuario antes de crear una skill nueva.

| Skill                        | Cuándo aplicarla                                                |
|-------------------------------|------------------------------------------------------------------|
| `nestjs-best-practices`       | Módulos, DI, guards, DTOs, excepciones y arquitectura en `backend/` |
| `nodejs-backend-patterns`     | Middlewares, manejo de errores y diseño de endpoints en `backend/` |
| `nodejs-best-practices`       | Decisiones generales de arquitectura/async en Node.js            |
| `bash-defensive-patterns`     | Scripts de shell (ej. `backend/scripts/`, comandos de despliegue) |
| `typescript-advanced-types`   | Tipos genéricos o condicionales complejos en `backend/` o `frontend/` |
| `zod`                         | Esquemas de validación (DTOs del MCP, formularios de `frontend/`) |
| `react-best-practices`        | Componentes y páginas de `frontend/`, performance de React/Vite  |
| `react-hook-form`             | Formularios controlados con React Hook Form en `frontend/`       |
| `composition-patterns`        | Diseño de componentes reutilizables con props/estado complejo    |
| `tailwind-css-patterns`       | Estilos con Tailwind CSS 4, layouts responsive                   |
| `accessibility`                | Auditoría o mejora de accesibilidad (WCAG) en `frontend/`        |
| `frontend-design`             | UI nueva o rediseño visual — usar junto con `frontend/DESIGN.md` |
| `vite`                        | Configuración de `vite.config.ts` o build de `frontend/`         |
| `seo`                          | Metadatos, sitemap u optimización de buscadores en `frontend/`   |

> Mantener esta tabla actualizada cuando se agreguen o modifiquen skills en
> `/.claude/skills/`.

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
`CLAUDE.md` técnico. Los subagentes y skills, en cambio, se comparten desde
`/.claude/` en la raíz (ver secciones anteriores).

```
01-ToDo/
├── .claude/
│   ├── agents/   # Subagentes compartidos (architect, reviewer, tester, mcp-builder)
│   └── skills/   # Skills instaladas (no versionadas)
├── backend/      # API REST + servidor MCP — NestJS 11 + PostgreSQL 16
├── frontend/     # SPA — React 19 + Vite + TypeScript
├── spec/         # Specs de funcionalidades (todo el ecosistema)
└── docs/
    ├── mcps/     # System prompts de los MCPs
    └── testing/  # Pruebas manuales por spec
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
| `AUTH_EMAIL` | `.env` | Email del usuario único (spec-021) |
| `AUTH_PASSWORD` | `.env` | Contraseña en texto plano (spec-021) — solo de referencia/recuperación, el login nunca la compara directamente |
| `AUTH_PASSWORD_HASH` | `.env` | Hash bcrypt de la contraseña (spec-021) — usado por el login vía `bcrypt.compare()`; generar ambos con `backend/scripts/generate-bcrypt-hash.js` |
| `JWT_SECRET` | `.env` | Secret para firmar JWT (spec-021) — mín. 32 caracteres |
| `JWT_EXPIRES_IN` | `.env` | Expiración del JWT (spec-021) — ej. `30d`, default `30d` |
| `MCP_API_KEY` | `.env` | Token estático para autenticar `/mcp` (spec-021) |
| `VITE_API_URL` | `frontend/.env.local` | URL base de la API (`http://localhost:3003/api/v1`) |

> ⚠️ Nunca escribas valores reales de variables de entorno en este archivo
> ni en ningún archivo rastreado por git.

---

## Base de datos

- Motor: PostgreSQL 16 en Docker (puerto 5433).
- ORM: TypeORM con **`synchronize: false` siempre** (dev y producción) — este
  proyecto no usa `synchronize: true` en ningún entorno, a diferencia de otros
  proyectos del stack. Todo cambio de esquema requiere una migración explícita,
  incluso en desarrollo local.
- CLI de migraciones: configurado en `backend/src/data-source.ts`.
  ```bash
  npx typeorm migration:run -d src/data-source.ts
  npx typeorm migration:generate src/migrations/<Nombre> -d src/data-source.ts
  ```
- Nunca ejecutar migraciones en entornos distintos al local sin confirmación explícita.

---

## Backend y/o APIs

API REST propia (NestJS), sin dependencias de APIs externas de terceros.

- Framework: NestJS 11 con prefijo global `/api/v1`.
- Respuestas envueltas por `TransformInterceptor`: `{ statusCode, message, data }`.
- Errores formateados por `HttpExceptionFilter`.
- Validación con `ValidationPipe` (whitelist + transform).
- CORS habilitado para `FRONTEND_URL` (`.env`).
- Swagger disponible en desarrollo (`/api/v1/docs`).
- Autenticación: JWT (spec-021) — un solo usuario, credenciales en `.env`
  (`AUTH_EMAIL` / `AUTH_PASSWORD_HASH`), token vía `Authorization: Bearer`.
  `/mcp` se autentica aparte con `MCP_API_KEY`.

- Base URL desarrollo: `http://localhost:3003/api/v1`
- Base URL producción: `{{url de producción del backend}}`

| Método | Ruta                    | Descripción                      |
|--------|-------------------------|----------------------------------|
| POST   | `/auth/login`           | Login del usuario único (JWT)    |
| GET/POST/PATCH/DELETE | `/projects` | CRUD de proyectos |
| GET/POST/PATCH/DELETE | `/activities` | CRUD de actividades, subtareas y plantillas recurrentes |
| GET/POST/PATCH/DELETE | `/expenses`, `/incomes`, `/purchases`, `/accounts`, `/credit-cards`, `/cdts`, `/budgets`, `/debts` | CRUD estándar por recurso financiero |

> Detalle completo de rutas, entidades, lógica de negocio y tools MCP: ver
> `backend/CLAUDE.md`.

> Estas rutas son también el canal por el que Claude prepara y limpia los datos
> de las pruebas manuales asistidas (ver "Pruebas manuales asistidas por Claude").

---

## Arquitectura y patrones internos

### Backend (`backend/src/`)

```
src/
├── activities/      # Actividades, subtareas y recurrencia (controller, service, entity, DTOs, cron)
├── projects/        # Módulo de proyectos (controller, service, entity, DTOs)
├── finances/        # Gastos, ingresos, compras, cuentas, tarjetas, CDTs, presupuestos, deudas
├── mcp/             # Servidor MCP (tools para integración con IA)
├── auth/            # Login JWT del usuario único (spec-021)
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
- Ubicación de tests unitarios backend: junto al módulo (`src/**/*.spec.ts`).
- Tests e2e backend: `backend/test/` con configuración `jest-e2e.json`.
- No hay suite automatizada en frontend — validación por casos manuales en
  `docs/testing/`.
- **Los archivos de prueba (manuales y automáticos) se escriben al redactar el
  spec, no al final.** Ver "Specs de funcionalidades → Artefactos que
  acompañan al spec". Encodifican los criterios de aceptación y arrancan en
  rojo (fallan, o no existen los casos que ejecutar) hasta que la
  implementación los pone en verde.
- No borrar ni modificar tests existentes sin instrucción explícita.
- Los tests e2e/unitarios son responsabilidad de `@tester`, que los ejecuta
  como última fase de cada spec antes del merge a `development`; el archivo de
  test ya existe desde la redacción del spec.
- La **ejecución** de las pruebas manuales la realiza el usuario sobre la UI;
  Claude prepara los datos, guía el proceso y registra los hallazgos
  (ver "Pruebas manuales asistidas por Claude").

---

## Specs de funcionalidades

### Ubicación y nomenclatura

- Carpeta: `spec/` en el directorio raíz del proyecto (todo el ecosistema:
  backend, frontend o ambos).
- Nomenclatura: `spec-{{NNN}}-{{slug-descriptivo}}.md`
  (NNN = correlativo con cero a la izquierda, ej. `spec-024-offline-sync.md`)
- Consultar specs anteriores antes de nombrar uno nuevo para evitar solapamiento.
- Los specs `00_...` a `12_...` son anteriores a esta convención y se
  mantienen como registro histórico; no se renombran retroactivamente.

### Estados válidos

| Estado          | Significado                                              |
|-----------------|----------------------------------------------------------|
| `[NOT STARTED]` | Spec redactado (con sus pruebas), sin implementación iniciada |
| `[IN PROGRESS]` | Implementación iniciada                                  |
| `[TESTING]`     | Implementación completa, pendiente de pruebas manuales/e2e |
| `[DONE]`        | Pruebas superadas, listo para merge a `development`      |

- **Todo spec que no esté en `[IN PROGRESS]`, `[TESTING]` o `[DONE]` debe estar
  marcado explícitamente como `[NOT STARTED]`.** No existen specs sin estado en
  el título (salvo los heredados `00_...`–`12_...`, ver arriba): si Claude
  encuentra uno, debe marcarlo como `[NOT STARTED]` y avisarlo al usuario.
- Todo spec **nace en `[NOT STARTED]`**, junto con sus archivos de prueba. Ese
  es su estado mientras espera la aprobación del usuario para implementarse.
- Un spec puede permanecer en `[NOT STARTED]` indefinidamente (backlog, spec
  planificado, spec pospuesto); eso no lo invalida ni autoriza a implementarlo.
- Transición válida: `[NOT STARTED]` → `[IN PROGRESS]` → `[TESTING]` → `[DONE]`.
  No saltarse estados ni retroceder sin avisar al usuario.
- Los specs completados **no se borran**; se marcan con `[DONE]` en el título.
- Solo specs en estado `[DONE]` con su archivo `test-NNN` correspondiente
  pueden hacer merge a `development`.
- El paso de `[NOT STARTED]` a `[IN PROGRESS]` solo ocurre **después** de la
  aprobación explícita del usuario para iniciar la implementación.

### Artefactos que acompañan al spec

> Al redactar un spec se escriben, **en el mismo momento**, sus archivos de
> prueba. No se dejan para el final del spec ni para el cierre de la
> implementación: definen la aceptación por adelantado (enfoque test-first).

Cada spec `spec-NNN-slug` nace junto con:

| Artefacto           | Ubicación                                  | Contenido                                                                 |
|---------------------|--------------------------------------------|---------------------------------------------------------------------------|
| Spec                | `spec/spec-NNN-slug.md`                     | Contexto, alcance, fases, criterios de aceptación                         |
| Pruebas manuales    | `docs/testing/test-NNN-slug.md`             | Casos manuales (`TC-NNN`, y `TC-MCP-NNN` si aplica) — solo si el spec toca frontend/UI |
| Pruebas automáticas | `backend/test/e2e-NNN-slug.spec.ts` (e2e) y/o `backend/src/**/*.spec.ts` (unit) | Casos derivados de los criterios de aceptación, en rojo — solo si el spec toca backend |

- Los tres artefactos comparten el mismo `NNN` y `slug` cuando aplican.
- Un spec que solo toca frontend puede no tener pruebas automáticas (el
  frontend no tiene suite automatizada); en ese caso el archivo de pruebas
  manuales es el único artefacto de aceptación y debe cubrir todos los
  criterios.
- Escribir estos archivos de prueba **no cuenta como la implementación**:
  encodifica lo que debe cumplirse. La implementación es lo que los pone en
  verde y es lo que requiere la aprobación previa del usuario.
- Si durante la implementación cambia el scope aprobado, actualizar también
  estos archivos de prueba (no editar el scope unilateralmente; ver
  "Durante la implementación").

### Estructura mínima de un spec

```md
# spec-NNN — [NOT STARTED] Título descriptivo
> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

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

## Pruebas asociadas
> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al spec").
- **Manuales:** `docs/testing/test-NNN-slug.md` — casos `TC-NNN` (y `TC-MCP-NNN` si aplica).
- **Automáticas (backend):** `backend/test/e2e-NNN-slug.spec.ts` y/o `*.spec.ts`
  junto al módulo — un caso por criterio de aceptación, escrito en rojo desde el inicio.

## Aprobación de implementación
> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{fecha}}
```

---

## Nuevas funcionalidades

### Antes de implementar

1. Analizar el impacto del feature en todos los componentes del proyecto.
2. Usar el subagente `@architect` para crear el plan de implementación:
   - Solo descripción de fases, pasos y archivos a editar.
   - Sin código de implementación.
3. **Evaluar si aplica MCP** (ver criterios en la sección siguiente).
   Si aplica, invocar `@mcp-builder` para diseñar la fase de MCP dentro del spec.
4. Crear la rama nueva desde `development` siguiendo las reglas de git.
   Esta rama aloja el spec, sus archivos de prueba y la futura implementación.
5. **Escribir, junto con el spec, sus archivos de prueba** (ver
   "Specs de funcionalidades → Artefactos que acompañan al spec"):
   - Pruebas manuales en `docs/testing/test-NNN-slug.md` (si el spec toca UI).
   - Pruebas automáticas en `backend/` derivadas de los criterios de
     aceptación (si el spec toca backend), escritas en rojo.
   - Invocar `@tester` para el diseño de los casos cuando aporte rigor al
     conjunto de pruebas.
6. Guardar el spec en `spec/` **con estado `[NOT STARTED]` en el título** y los
   archivos de prueba en sus carpetas, todos con la misma nomenclatura `NNN-slug`.
7. **Detenerse y esperar la aprobación explícita del usuario del paquete
   completo (spec + pruebas) antes de escribir una sola línea de código de
   implementación.** Esta regla no admite excepciones:
   - Aprobar el spec como documento **no** equivale a autorizar la implementación:
     debe existir una instrucción clara del usuario en esa misma sesión
     (ej. "procede con la implementación del spec-NNN").
   - Ante cualquier ambigüedad, preguntar con `AskUserQuestion` en lugar de asumir.
   - Mientras no exista esa aprobación, el spec permanece en `[NOT STARTED]`.
   - Al recibir la aprobación, marcar la casilla de "Aprobación de implementación"
     en el spec y recién entonces cambiar su estado de `[NOT STARTED]` a
     `[IN PROGRESS]`.
   - Si el usuario pide "avanzar" sin especificar, confirmar si se refiere a
     redactar el spec o a implementarlo.

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
- Al iniciar la Fase 1 de cualquier spec —lo que solo ocurre tras la aprobación
  explícita del usuario— cambiar su estado de `[NOT STARTED]` a `[IN PROGRESS]`.
- Al completar cada fase, documentarla como completada en el propio spec.
- La implementación consiste en poner en verde las pruebas ya escritas al
  redactar el spec; usarlas como guía de avance.
- La fase de MCP debe ejecutarse antes de la fase de pruebas e2e,
  para que `@tester` pueda validar también las herramientas expuestas.
- Si el scope del spec debe cambiar (nuevo hallazgo, bloqueante estructural),
  proponer la modificación al usuario **antes** de proceder. No editar el spec
  ni los archivos de prueba unilateralmente ni implementar fuera de él.
- Si se descubre deuda técnica fuera del scope, documentarla con un comentario
  `// DEBT:` en el código y registrarla en `spec/backlog.md`, sin actuar
  sobre ella en la tarea actual.
- Si aparece un bloqueante no previsto en el spec, reportarlo antes de improvisar.
- No modificar archivos fuera del alcance del spec sin avisar.

### Después de terminar la implementación

1. Verificar que los archivos de prueba creados al redactar el spec
   (`test-NNN` y las pruebas automáticas) siguen cubriendo los criterios de
   aceptación finales; ajustarlos si el scope cambió durante la implementación
   (con la aprobación correspondiente).
2. Cambiar el estado del spec a `[TESTING]`.
3. El usuario ejecutará los casos manuales de `docs/testing/test-NNN`. Si pide
   apoyo, Claude lo acompaña siguiendo el protocolo de
   "Pruebas manuales asistidas por Claude": prepara los datos vía API, guía
   paso a paso, marca los hallazgos en el archivo de test y elimina los datos
   al finalizar.
4. Cuando todos los casos manuales estén aprobados, invocar `@tester` para
   ejecutar las pruebas automáticas ya definidas y confirmar que pasan en verde.
5. Al superar todas las pruebas (manuales y automáticas), marcar el spec como `[DONE]`.

### Pruebas manuales — estructura del archivo

- Todos los archivos `test-NNN` van en `docs/testing/` en el directorio raíz
  y se crean al redactar el spec, no al cerrarlo.
- Solo incluir casos manuales de specs con UI (frontend). Los endpoints se
  validan con las pruebas automáticas asociadas al spec en `backend/`.
- Si el spec incluyó una fase de MCP, agregar casos de prueba específicos
  para las herramientas creadas o modificadas (prefijo `TC-MCP-NNN`).
- Cada caso de prueba debe tener un código identificador único
  (ej. `TC-001`, `TC-002`).

```md
# test-NNN — Título descriptivo

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.

| Recurso        | Endpoint de creación | Identificador | Eliminado |
|----------------|----------------------|---------------|-----------|
| {{recurso}}    | `POST /{{ruta}}`     | `{{id}}`      | ⬜ / ✅     |

**Entorno de pruebas:** {{desarrollo / staging}}
**Fecha de la ronda:** {{fecha}}

## Casos de prueba

### TC-001 — Nombre del caso
**Precondición:** ...
**Datos de prueba usados:** `{{id}}` / `{{credenciales}}`
**Pasos:**
1. ...
2. ...
**Resultado esperado:** ...
**Estado:** ⬜ Pendiente / ✅ Aprobado / ❌ Fallido
**Hallazgos:** {{observaciones reportadas por el usuario: error, comportamiento
inesperado, lentitud, detalle visual… o "sin observaciones"}}

### TC-MCP-001 — Nombre del caso MCP (si aplica)
**Herramienta probada:** `{{nombre-herramienta}}` en `todo-api`
**Precondición:** ...
**Input de prueba:** ...
**Output esperado:** ...
**Estado:** ⬜ Pendiente / ✅ Aprobado / ❌ Fallido
**Hallazgos:** ...

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: {{n}}
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente / ✅ Completada
```

---

## Pruebas manuales asistidas por Claude

> Aplica cuando el usuario pide apoyo para **ejecutar** los casos de
> `docs/testing/test-NNN-slug.md`. Claude actúa como copiloto: prepara los
> datos, guía la ejecución y registra los hallazgos.
> **Quien interactúa con la UI es siempre el usuario**, salvo instrucción
> explícita en contrario.

### 1. Preparación de datos vía API

- Leer el archivo `test-NNN-slug.md` completo e identificar las precondiciones
  de cada caso antes de crear nada.
- Confirmar con el usuario el **entorno** contra el que se trabajará. Por
  defecto, desarrollo (`http://localhost:3003/api/v1`). **Nunca crear datos de
  prueba en producción** sin confirmación explícita en esa misma sesión.
- Crear **todo lo necesario para ejecutar las pruebas vía API**: registros
  base, estados intermedios, relaciones y cualquier precondición del caso.
  Usar los endpoints documentados en "Backend y/o APIs" / `backend/CLAUDE.md`
  o las herramientas del MCP `todo-api`.
- No manipular la base de datos directamente para montar precondiciones
  salvo que el usuario lo indique; si no existe endpoint para algo necesario,
  reportarlo antes de improvisar.
- Registrar **cada recurso creado** (recurso, endpoint, payload relevante e
  identificador devuelto) en la sección "Datos de prueba" del archivo `test-NNN`.
  Sin este registro no se puede garantizar la limpieza posterior.
- Entregar al usuario, antes de empezar, el resumen de lo que quedó montado:
  IDs, estado inicial y qué caso cubre cada dato.

### 2. Guía paso a paso durante la ejecución

- Ejecutar **un caso de prueba a la vez**, en orden, sin adelantarse.
- Para cada caso, indicarle al usuario de forma explícita:
  - la precondición ya montada y con qué datos,
  - la pantalla o ruta desde la que debe partir,
  - los pasos concretos a seguir, numerados,
  - el resultado esperado y qué debe observar en detalle.
- Esperar el reporte del usuario antes de pasar al siguiente caso.
- Si el usuario reporta un fallo, pedir el mínimo detalle necesario para
  documentarlo (mensaje de error, respuesta de red, comportamiento observado)
  y ofrecer verificación por API del estado resultante del recurso.
- **No dar por aprobado ningún caso que el usuario no haya confirmado**, ni
  inferir resultados a partir de la respuesta de la API.

### 3. Registro de hallazgos

- Tras cada caso, actualizar `docs/testing/test-NNN-slug.md` inmediatamente:
  - cambiar el campo **Estado** (✅ Aprobado / ❌ Fallido),
  - completar el campo **Hallazgos** con lo observado, incluso si el caso pasó
    (comportamientos raros, lentitud, detalles visuales, mensajes poco claros).
- No esperar al final de la ronda para escribir: el archivo de test se actualiza
  caso por caso.
- Los hallazgos que impliquen bugs fuera del scope del spec se registran además
  en `spec/backlog.md`; **no se corrigen dentro de la sesión de pruebas** sin
  aprobación explícita del usuario.
- Al cerrar la ronda, completar la sección "Resumen de la ronda" del archivo.

### 4. Limpieza de datos

- Al terminar la ronda, **eliminar vía API todos los datos creados en el paso 1**,
  en orden inverso a su creación para respetar dependencias.
- Verificar que la eliminación fue efectiva (consultar el recurso y confirmar
  `404` / lista vacía).
- Marcar cada recurso como eliminado en la tabla "Datos de prueba" del archivo
  `test-NNN` y marcar la limpieza como completada en el resumen.
- Si algún recurso no puede eliminarse vía API, reportarlo al usuario con el
  identificador exacto y el motivo; **nunca borrarlo directamente en base de
  datos sin confirmación explícita**.
- No cerrar la sesión de pruebas dejando datos huérfanos en el entorno.
- Si el usuario pide conservar los datos para una segunda ronda, dejarlo
  anotado en el archivo `test-NNN` junto con los IDs pendientes de limpieza.

---

## Pruebas visuales y uso del navegador

- **Las pruebas visuales las ejecuta el usuario.** Claude no valida por su
  cuenta apariencia, layout, responsive ni comportamiento visual, salvo que el
  usuario le indique lo contrario de forma explícita.
- **Claude no abre ni controla el navegador** —navegación, automatización,
  capturas de pantalla, inspección del DOM— a menos que el usuario lo solicite
  expresamente en esa misma sesión.
- Si Claude considera que una verificación automatizada en navegador aportaría
  valor (por ejemplo, reproducir un bug reportado), puede **proponerlo** y
  esperar respuesta; nunca iniciarlo por su cuenta.
- Cuando el usuario autorice el uso del navegador, limitarse al alcance
  autorizado (entorno, rutas y casos indicados), no ejecutar acciones
  destructivas ni sobre producción, y reportar lo observado sin ampliar el
  alcance.
- La autorización es puntual: vale para la petición concreta, no para toda la
  sesión ni para sesiones futuras.
- Los tests e2e automatizados que ejecuta `@tester` como fase del spec no
  cuentan como "acceder al navegador" y siguen su flujo normal.

---

## Despliegue

> ⚠️ Ningún paso de esta sección debe ejecutarse sin confirmación explícita
> del usuario en la misma sesión. El despliegue siempre lo inicia el usuario;
> Claude puede asistir en la preparación y verificación.

### Infraestructura

#### Base de datos

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| Proveedor          | **Neon** (Postgres serverless), plan `free_v3`. En local, en cambio, es PostgreSQL 16 vía `docker-compose.yml` (puerto 5433, sin SSL) |
| Proyecto / Cluster | `to-do` (`proud-bar-87722527`) · rama por defecto `production` (`br-green-grass-aq3nn6w0`) |
| Base de datos      | **`neondb`**, rol `neondb_owner` (⚠️ **no** `todo_db` / `todo_user`: esos son los nombres **locales** de `docker-compose.yml`) |
| Versión de Postgres | **18** en producción · **16** en local — la diferencia es real: una migración probada solo en local no está probada contra producción |
| Región             | `aws-us-east-1`                            |
| Variable de conexión | `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` en `.env` (no `DATABASE_URL`: `data-source.ts` arma la conexión con campos sueltos) |
| Panel de control   | `https://console.neon.tech`                |

> **SSL:** Neon lo exige. `data-source.ts` y `app.module.ts` activan
> `ssl: { rejectUnauthorized: false }` **solo** cuando `NODE_ENV === 'production'`.
> Por eso el contenedor local `todo_backend` (que corre con
> `NODE_ENV=production`) entra en crash-loop contra el Postgres de Docker:
> exige SSL a un servidor que no lo ofrece. Para desarrollo local se usa
> `npm run start:dev` con `NODE_ENV=development`, no ese contenedor.

> **Branching de Neon para ensayar migraciones.** Antes de un despliegue con
> cambios de esquema, crear una rama de la base de producción en Neon
> (instantánea, copy-on-write) y correr la migración **contra esa rama**
> primero: es el único ensayo fiel contra datos reales sin arriesgarlos. Ver
> "Proceso de despliegue — Backend", paso 2.

> **Point-in-time restore: solo 6 horas.** El plan `free_v3` tiene
> `history_retention_seconds: 21600`. Si una migración corrompe datos y no
> se detecta dentro de esa ventana, el PITR ya no sirve. Por eso, antes de
> un despliegue con esquema destructivo, crear también una rama de respaldo
> (ej. `backup-pre-vX.Y.Z`) y **dejarla intacta**: una rama es un punto de
> restauración permanente, congelado y ajeno a la ventana de 6 h.

> **Ojo con `set -a; . ./archivo.env`** para cargar credenciales al probar:
> el shell expande los `$` de un hash bcrypt (`$2b$10$…`) y lo corrompe en
> silencio, produciendo un `401` incomprensible en el login. Entrecomillar
> los valores (`CLAVE='valor'`) al generar ese archivo.

#### Backend

| Campo            | Valor                                          |
|------------------|--------------------------------------------------|
| Proveedor        | `Railway` (build vía Dockerfile, ver `backend/railway.toml`) |
| Proyecto         | `graceful-beauty` (`6e64b5a5-8028-45ef-a264-14b660e3ed45`) |
| Servicio         | `steadfast-ambition` (`490429f5-93da-4737-8c4c-7a4485c2d794`) |
| Entorno          | `production` (`9186f32b-d69d-443b-8b4a-0879a06b4f22`) |
| Healthcheck      | `/api/v1/docs` (definido en `railway.toml`)    |
| URL producción   | `https://steadfast-ambition-production.up.railway.app` |
| Deploy trigger   | **Automático al hacer push a `main`.** El push dispara build + deploy, y `entrypoint.sh` corre las migraciones pendientes antes de arrancar el server |
| Panel de control | `https://railway.app/project/6e64b5a5-8028-45ef-a264-14b660e3ed45` |

#### Frontend

| Campo            | Valor                                          |
|------------------|--------------------------------------------------|
| Proveedor        | `Vercel` (rewrites de SPA en `frontend/vercel.json`) |
| Proyecto         | **`todo-backend`** (`prj_5MGesM4WPafJfATi8mAe51gLg7N5`) — ⚠️ el nombre engaña: este proyecto sirve el **frontend**. El backend está en Railway |
| Equipo           | `santiago-suarez-cortes-projects` (`team_UrkjAmj3hPNfGUbN1rJXESVd`), plan Pro |
| Rama de producción | `main`                                       |
| URL producción   | `{{url pública — las URLs de deployment devuelven 302 por deployment protection; anotar la real}}` |
| Deploy trigger   | **Automático al hacer push a `main`** (mismo push que dispara Railway). También despliega previews desde `development` |
| Panel de control | `https://vercel.com/santiago-suarez-cortes-projects/todo-backend` |

> La rama `deploy/vercel` del historial **ya no es el flujo vigente**:
> verificado en el despliegue de v2.0.0 (2026-09-05) que Vercel despliega a
> producción por sí solo con cada push a `main`, sin rama intermedia. El
> mismo push dispara Railway y Vercel a la vez; no hay que promover nada a
> mano. La rama `deploy/vX.Y.Z` sigue siendo útil como punto de
> preparación/revisión antes de mergear a `main`, pero no es un destino de
> despliegue en sí.

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
- [ ] Los datos de prueba de las rondas manuales fueron eliminados de los
      entornos correspondientes.
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

2. **Ensayar la migración en una rama de Neon** *(solo si hay cambios de esquema)*
   > ⚠️ Requiere confirmación explícita del usuario antes de ejecutar.

   **La migración NO se ejecuta a mano en producción:** `backend/entrypoint.sh`
   corre `npm run migration:run:prod` automáticamente al arrancar el
   contenedor, así que el `git push origin main` del paso 4 la dispara solo.
   Con `set -e`, si falla, el contenedor no arranca y Railway lo reintenta
   (`restartPolicyType = "on_failure"`) — un fallo de migración es un deploy
   caído, no una app degradada.

   Por eso el ensayo previo contra una rama de Neon es el paso que de verdad
   protege: es la única forma de correr la migración contra los datos reales
   sin tocarlos.
   ```bash
   # 1. Crear la rama de producción en la consola de Neon.
   # 2. Volcar sus credenciales en backend/.env.neon.local
   #    (gitignored por el patrón `.env.*.local`; NUNCA usar un nombre
   #    fuera de ese patrón: `.env.neon-branch`, por ejemplo, SÍ se commitea).
   #    Incluir NODE_ENV=production para que se active el SSL que Neon exige.
   # 3. Correr la migración contra la rama, sin tocar el .env local:
   cd backend
   set -a; . ./.env.neon.local; set +a
   npx typeorm migration:run -d src/data-source.ts
   ```
   Verificar el resultado contra los criterios de aceptación del spec (ej.
   conteos de filas antes/después) y **eliminar la rama de Neon** al terminar.
   Si el ensayo falla, corregir la migración antes de seguir: el mismo fallo
   tumbaría el deploy real.

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
   - Pedir al usuario que navegue a `{{url de producción}}` y verifique que la
     aplicación carga correctamente; la verificación visual es suya salvo que
     autorice explícitamente el uso del navegador por parte de Claude.
   - Solicitar al usuario la revisión de la consola del navegador en busca de
     errores críticos.

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

- **Iniciar la implementación de un spec** (escribir código, crear archivos de
  implementación, modificar módulos existentes) sin aprobación explícita del
  paquete spec + pruebas.
- **Abrir o controlar el navegador** para navegar, automatizar o verificar
  visualmente la aplicación sin que el usuario lo haya solicitado.
- Dar por aprobado un caso de prueba manual que el usuario no haya confirmado.
- Crear datos de prueba en producción, o cerrar una ronda de pruebas manuales
  dejando datos de prueba sin eliminar.
- Borrar archivos o carpetas (salvo temporales generados por la propia tarea).
- Ejecutar migraciones de base de datos en entornos distintos al local.
- Hacer push a `main` o `development` directamente.
- Modificar variables de entorno de producción.
- Instalar dependencias nuevas sin mencionarlo y esperar confirmación.
- Hacer commit de archivos `.env*` reales.
- Editar el spec activo o sus archivos de prueba para ampliar su scope sin
  aprobación del usuario.
- Dejar un spec sin estado en el título o cambiarlo de estado sin que se cumplan
  las condiciones de la transición (ver "Specs de funcionalidades → Estados válidos").
- Eliminar o reemplazar un MCP activo sin confirmar que ningún agente lo consume.
- Modificar un system prompt en `docs/mcps/` fuera de una fase de MCP
  aprobada en el spec correspondiente.
- Borrar datos directamente en base de datos cuando la limpieza vía API falle;
  reportar al usuario en su lugar.

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
test(expenses): add red e2e cases for spec-024 duplicate expense
docs(testing): record manual findings for test-024 round 1
```
