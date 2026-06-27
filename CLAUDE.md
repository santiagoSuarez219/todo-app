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

En `/.agents/` viven instrucciones para subagentes. Leer el archivo del agente
antes de invocarlo. No improvisar su comportamiento.

| Agente        | Cuándo invocarlo                                              |
|---------------|---------------------------------------------------------------|
| `@architect`  | Diseño de specs: fases, archivos impactados, sin código       |
| `@reviewer`   | Revisión de código antes de marcar un spec como `[DONE]`     |
| `@tester`     | Generación y ejecución de casos de prueba e2e                 |

---

## Contexto del proyecto

App personal de gestión de actividades y proyectos. Permite crear, organizar y
hacer seguimiento de tareas con atributos como prioridad, energía, tipo, fechas
y subtareas. Incluye un servidor MCP para integración con asistentes de IA.
Estado actual: MVP en desarrollo activo.

---

## Repositorios del ecosistema

```
01-ToDo/
├── backend/    # API REST — NestJS 11 + PostgreSQL 16
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
- Archivo frontend: `frontend/.env.local` — nunca commitear.

| Variable | Archivo | Descripción |
|----------|---------|-------------|
| `DB_PORT` | `.env` | Puerto PostgreSQL (5433) |
| `DB_NAME` | `.env` | Nombre de la base de datos (`todo_db`) |
| `DB_USER` | `.env` | Usuario de la base de datos |
| `DB_PASSWORD` | `.env` | Contraseña de la base de datos |
| `FRONTEND_URL` | `.env` | URL del frontend para CORS |
| `VITE_API_URL` | `frontend/.env.local` | URL base de la API (`http://localhost:3002/api/v1`) |

> ⚠️ Nunca escribas valores reales de variables de entorno en este archivo
> ni en ningún archivo rastreado por git.

---

## Base de datos

- Motor: PostgreSQL 16 en Docker (puerto 5433).
- ORM: TypeORM con `synchronize: false` en producción.
- En desarrollo se puede usar `synchronize: true` para iterar rápido.
- Cuando hagas modificaciones al esquema, crea siempre una migración para producción.
- Nunca ejecutar migraciones en entornos distintos al local sin confirmación explícita.
- CLI de migraciones: configurado en `backend/src/data-source.ts`.

---

## Backend — API REST

- Framework: NestJS 11 con prefijo global `/api/v1`.
- Respuestas envueltas por `TransformInterceptor`: `{ data: ... }`.
- Errores formateados por `HttpExceptionFilter`.
- Validación con `ValidationPipe` (whitelist + transform).
- CORS habilitado para `FRONTEND_URL` (`.env`).
- Swagger disponible en desarrollo.

- Base URL desarrollo: `http://localhost:3002/api/v1`

| Método | Ruta                    | Descripción                      |
|--------|-------------------------|----------------------------------|
| GET    | `/projects`             | Listar proyectos                 |
| POST   | `/projects`             | Crear proyecto                   |
| GET    | `/projects/:id`         | Detalle de proyecto              |
| PATCH  | `/projects/:id`         | Actualizar proyecto              |
| DELETE | `/projects/:id`         | Eliminar proyecto                |
| GET    | `/activities`           | Listar actividades (paginado)    |
| POST   | `/activities`           | Crear actividad                  |
| GET    | `/activities/:id`       | Detalle de actividad             |
| PATCH  | `/activities/:id`       | Actualizar actividad             |
| DELETE | `/activities/:id`       | Eliminar actividad               |

---

## Arquitectura y patrones internos

### Backend (`backend/src/`)

```
src/
├── activities/      # Módulo de actividades (controller, service, entity, DTOs)
├── projects/        # Módulo de proyectos (controller, service, entity, DTOs)
├── mcp/             # Servidor MCP (tools para integración con IA)
├── common/          # Interceptors, filtros y pipes globales
├── main.ts          # Bootstrap, CORS, pipes globales
├── app.module.ts    # Módulo raíz
└── data-source.ts   # Config TypeORM / CLI de migraciones
```

### Frontend (`frontend/src/`)

```
src/
├── components/      # Componentes reutilizables (sin lógica de negocio)
├── pages/           # Vistas/páginas por ruta
├── hooks/           # Custom hooks (React Query)
├── services/        # Llamadas HTTP puras (sin React)
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
`type` (TASK | EVENT | REMINDER) · `device` (PHONE | COMPUTER | TABLET)
`actionDate` · `dueDate` · `duration` · `durationUnit` · `location`

---

## Sistema de diseño — Flowbite + Tailwind CSS 4

- Fuente: **JetBrains Mono** para todo el proyecto.
- Paleta: gray, blue, green, red, yellow, purple, pink (escala 50–900).
- Tokens semánticos en `frontend/src/index.css` (`@theme { ... }`).
- Dark mode: clase `dark` en `<html>`, persistida en `localStorage` con clave `color-theme`.
- Detalles completos de la paleta, tokens y tabla de clases en `DESIGN.md`.

### Rutas del frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Dashboard` | Overview / estadísticas |
| `/projects` | `ProjectList` | CRUD de proyectos |
| `/projects/:id` | `ProjectDetail` | Proyecto + actividades |
| `/activities` | `ActivityList` | Todas las actividades (paginado) |
| `/activities/today` | `TodayView` | Actividades de hoy |
| `/activities/this-week` | `WeekView` | Actividades de la semana |
| `/activities/overdue` | `OverdueView` | Actividades vencidas |
| `/activities/backlog` | `BacklogView` | Actividades sin fecha |

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
- No hay tests en frontend actualmente.
- Antes de cerrar una tarea con lógica crítica en el backend, verificar que existe
  al menos un test que cubra el caso feliz.
- No borrar ni modificar tests existentes sin instrucción explícita.
- Los tests e2e son responsabilidad de `@tester` y se ejecutan como última fase de
  cada spec antes del merge a `development`.

---

## Specs de funcionalidades

### Ubicación y nomenclatura

- Carpeta: `spec/` en el directorio raíz del proyecto.
- Nomenclatura: `spec-{{NNN}}-{{slug-descriptivo}}.md`
  (NNN = correlativo con cero a la izquierda, ej. `spec-007-offline-sync.md`)
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

## Fases de implementación

### Fase 1 — Nombre
- [ ] Paso concreto
- [ ] Paso concreto

### Fase 2 — Nombre
- [ ] Paso concreto

## Criterios de aceptación
- El usuario puede hacer X.
- El sistema responde con Y ante Z.

## Pruebas e2e (si aplica)
Descripción de los casos a automatizar en la última fase, ejecutados por @tester.
```

---

## Nuevas funcionalidades

### Antes de implementar

1. Analizar el impacto del feature en todos los componentes del proyecto.
2. Usar el subagente `@architect` para crear el plan de implementación:
   - Solo descripción de fases, pasos y archivos a editar.
   - Sin código.
3. Guardar el plan en `spec/` con la nomenclatura definida.
4. Esperar aprobación del usuario antes de escribir código.
5. Crear una rama nueva desde `development` siguiendo las reglas de git.

### Durante la implementación

- Trabajar fase por fase según el spec; no saltarse pasos.
- Al iniciar la Fase 1 de cualquier spec, cambiar su estado a `[IN PROGRESS]`.
- Al completar cada fase, documentarla como completada en el propio spec.
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
```

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

---

## Git — Branching & Commits

### Estructura de ramas

| Propósito                         | Prefijo     | Ejemplo                          |
|-----------------------------------|-------------|----------------------------------|
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
```
