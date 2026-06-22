# CLAUDE.md — ToDo

> Este archivo es la fuente de verdad para Claude Code en este proyecto.
> Léelo completo antes de ejecutar cualquier acción.

---

## Inicialización de sesión

Antes de cualquier tarea, Claude debe ejecutar estos pasos en orden:

1. Leer este archivo completo.
2. Leer `frontend/DESIGN.md` si la tarea involucra UI.
3. Listar los specs activos (`[IN PROGRESS]` o `[TESTING]`) en `specs/`.
4. Confirmar la rama actual con `git status`.
5. Si hay un spec en curso o decisión de arquitectura pendiente, pedirlo al usuario antes de proceder.

---

## Reglas generales

- Toda la comunicación con el usuario debe ser en **español**.
- Antes de editar cualquier archivo, leer las secciones relevantes de su contenido. Para archivos de más de 300 líneas, navegar por secciones antes de editar; no asumir estructura sin haberla leído.
- No adivines rutas, imports ni nombres de variables: confírmalos leyendo el código.
- Si tienes dudas bloqueantes, usa `AskUserQuestion` antes de proceder.
- Nunca interrumpas una tarea a mitad para pedir confirmación, salvo que el riesgo de continuar sea alto (borrado de datos, cambios en producción, etc.).
- Prefiere cambios quirúrgicos sobre refactors amplios no solicitados.
- Para cualquier tarea que involucre UI, leer `frontend/DESIGN.md` antes de escribir código.

---

## Agentes especializados

En `/.agents/` viven instrucciones para subagentes. Leer el archivo del agente antes de invocarlo.

| Agente       | Cuándo invocarlo                                              |
|--------------|---------------------------------------------------------------|
| `@architect` | Diseño de specs: fases, archivos impactados, sin código       |
| `@reviewer`  | Revisión de código antes de marcar un spec como `[DONE]`     |
| `@tester`    | Generación y ejecución de casos de prueba e2e                 |

---

## Contexto del proyecto

Aplicación de productividad personal (ToDo) con gestión de proyectos y actividades. Permite organizar tareas, eventos y recordatorios agrupados por proyecto, con filtros temporales (hoy, esta semana, vencidas). Incluye un servidor MCP para que agentes de IA puedan interactuar con los datos directamente.

Estado actual: **MVP funcional** en desarrollo activo.

---

## Repositorios del ecosistema

```
01-ToDo/
├── backend/    # API REST — NestJS 11 + PostgreSQL 16
├── frontend/   # SPA — React 19 + Vite + TypeScript
├── specs/      # Specs de funcionalidades
└── docs/       # Documentación técnica y archivos de prueba
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios |
| Estilos | Tailwind CSS 4 |
| Backend | NestJS 11 + TypeScript 5.7 |
| ORM | TypeORM |
| Base de datos | PostgreSQL 16 (Docker, puerto 5433, db: `todo_db`) |
| MCP | `@modelcontextprotocol/sdk` |

### Comandos

```bash
# Backend — instalar dependencias
cd backend && npm install

# Backend — desarrollo
cd backend && npm run start:dev

# Backend — build
cd backend && npm run build

# Frontend — instalar dependencias
cd frontend && npm install

# Frontend — desarrollo
cd frontend && npm run dev

# Frontend — build
cd frontend && npm run build

# Base de datos — correr migraciones
cd backend && npx typeorm migration:run -d src/data-source.ts

# Base de datos — generar migración
cd backend && npx typeorm migration:generate src/migrations/<Nombre> -d src/data-source.ts
```

---

## Dependencias

- Package manager: `npm` — no mezclar managers.
- Antes de instalar una dependencia nueva:
  1. Verificar si ya existe algo equivalente en el `package.json` del subproyecto.
  2. Mencionarlo al usuario con justificación clara.
  3. Esperar confirmación explícita.
- Nunca instalar dependencias de desarrollo en `dependencies` ni al revés.

---

## Variables de entorno

- Backend — archivo real: `.env` (raíz del proyecto, nunca commitear)
- Frontend — archivo real: `frontend/.env.local` (nunca commitear)

```env
# Backend (.env)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=todo_db
DB_USER=todo_user
DB_PASSWORD=todo_password
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Frontend (frontend/.env.local)
VITE_API_URL=http://localhost:3000/api/v1
```

> Nunca escribas valores reales de variables de entorno en archivos rastreados por git.

---

## Base de datos

- Motor: PostgreSQL 16 en Docker (`docker-compose.yml`, puerto externo `5433`).
- `synchronize: false` — **nunca** se sincronizan esquemas automáticamente.
- Toda modificación de esquema requiere una migración explícita.
- Nunca ejecutar migraciones en entornos distintos al local sin confirmación explícita.

---

## Arquitectura y patrones internos

```
Browser :5173
  └── React SPA
        Pages → Hooks (React Query) → Services → Axios
                                                    │
                                            REST /api/v1
                                                    │
                                         NestJS :3000
                                           Controllers
                                           Services
                                           TypeORM
                                                    │
                                         PostgreSQL :5433
                                           projects
                                           activities

                                         + MCP Server /mcp
```

Ver `backend/CLAUDE.md` para detalle de endpoints y entidades.
Ver `frontend/CLAUDE.md` para detalle de rutas, hooks y componentes.

---

## Convenciones de código

- Lenguaje: **TypeScript estricto** (`strict: true`).
- Nombres de archivos: `kebab-case` para páginas, `PascalCase` para componentes React.
- Nombres de funciones y variables: `camelCase`.
- No usar `any` salvo que sea absolutamente inevitable; documentarlo con `// TODO: type this`.
- No agregar comentarios que expliquen el *qué*; solo agregar cuando el *por qué* no es obvio.
- Backend: lógica de negocio en el servicio, nunca en el controlador.
- Frontend: nunca llamar servicios directamente desde páginas; siempre usar hooks.

---

## Testing

- No borrar ni modificar tests existentes sin instrucción explícita.
- Antes de cerrar una tarea con lógica crítica, verificar que existe al menos un test que cubra el caso feliz.
- Los tests e2e son responsabilidad de `@tester` y se ejecutan como última fase de cada spec antes del merge a `development`.

---

## Specs de funcionalidades

### Ubicación y nomenclatura

- Carpeta: `specs/` en la raíz del proyecto.
- Nomenclatura: `spec-NNN-slug-descriptivo.md` (NNN correlativo con cero izquierdo, ej. `spec-007-offline-sync.md`).
- Consultar specs anteriores antes de nombrar uno nuevo para evitar solapamiento.

### Estados válidos

| Estado          | Significado                                                  |
|-----------------|--------------------------------------------------------------|
| `[IN PROGRESS]` | Implementación iniciada                                      |
| `[TESTING]`     | Implementación completa, pendiente de pruebas manuales/e2e   |
| `[DONE]`        | Pruebas superadas, listo para merge a `development`          |

- Los specs completados **no se borran**; se marcan `[DONE]` en el título.
- Solo specs `[DONE]` con su archivo `test-NNN` correspondiente pueden hacer merge a `development`.

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

### Fase 2 — Nombre
- [ ] Paso concreto

## Criterios de aceptación
- El usuario puede hacer X.
- El sistema responde con Y ante Z.

## Pruebas e2e (si aplica)
Descripción de los casos a automatizar, ejecutados por @tester.
```

---

## Nuevas funcionalidades

### Antes de implementar

1. Analizar el impacto del feature en todos los componentes del proyecto.
2. Usar `@architect` para crear el plan: solo fases, pasos y archivos a editar, sin código.
3. Guardar el plan en `specs/` con la nomenclatura definida.
4. Esperar aprobación del usuario antes de escribir código.
5. Crear una rama nueva desde `development` siguiendo las reglas de git.

### Durante la implementación

- Trabajar fase por fase según el spec; no saltarse pasos.
- Al iniciar la Fase 1, cambiar el estado del spec a `[IN PROGRESS]`.
- Al completar cada fase, documentarla como completada en el propio spec.
- Si el scope debe cambiar, proponer la modificación al usuario **antes** de proceder.
- Si se descubre deuda técnica fuera del scope, documentarla con `// DEBT:` en el código y registrarla en `specs/backlog.md`.
- No modificar archivos fuera del alcance del spec sin avisar.

### Después de terminar la implementación

1. Crear el archivo de pruebas en `docs/testing/test-NNN-slug-descriptivo.md`.
2. Cambiar el estado del spec a `[TESTING]`.
3. El usuario ejecuta los casos y reporta cuáles pasan. Claude marca cada caso como completado.
4. Al superar todos los casos, invocar `@tester` para e2e (si aplica).
5. Al superar todas las pruebas, marcar el spec como `[DONE]`.

### Pruebas manuales — estructura del archivo

```md
# test-NNN — Título descriptivo

## Casos de prueba

### TC-001 — Nombre del caso
**Precondición:** ...
**Pasos:**
1. ...
**Resultado esperado:** ...
**Estado:** ⬜ Pendiente / ✅ Aprobado / ❌ Fallido
```

---

## Acciones prohibidas

> Claude nunca debe realizar las siguientes acciones sin confirmación explícita del usuario en esa misma sesión:

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

| Propósito | Prefijo | Ejemplo |
|-----------|---------|---------|
| Nueva funcionalidad o spec | `feature/` | `feature/offline-sync` |
| Corrección de bug | `bug/` | `bug/login-token-refresh` |
| Preparación de despliegue | `deploy/` | `deploy/v1.0.0` |

- `main` — producción; solo recibe merges desde `deploy/`.
- `development` — integración y pruebas; todas las ramas `feature/` y `bug/` se desprenden de aquí.
- Al mergear una rama a `development`, eliminarla inmediatamente.
- Solo specs `[DONE]` con su `test-NNN` aprobado pueden hacer merge a `development`.

### Commits

- Hacer commits cuando el volumen de cambios lo justifique; no commits triviales.
- Mensajes **completamente en inglés**, siguiendo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

Tipos válidos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `ci`.

Ejemplos:
```
feat(activities): add inline quick-edit for name and priority
fix(overdue): correct timezone offset in dueDate comparison
chore(deps): upgrade typeorm to v0.3.20
```
