# spec-029 — [DONE] Horizonte de proyecto (`horizon`)

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Depende de **spec-027** y **spec-028**
> (`[DONE]`). Es el único spec del paquete que toca `Project` y no `Activity`.

## Contexto

`Project.status` (`active | inactive | paused | completed`) responde **"¿está
vivo este proyecto?"**, pero no responde **"¿es esto lo que estoy haciendo
ahora?"**. Hoy todos los proyectos `active` pesan igual, y en la práctica el
usuario tiene simultáneamente proyectos que está empujando esta semana y
proyectos que están activos pero que no va a tocar en meses. Ambos compiten
visualmente por la misma atención.

`horizon` agrega esa segunda dimensión: **el horizonte temporal/estratégico** en
el que vive un proyecto. Es ortogonal a `status` (un proyecto puede estar
`active` y ser de horizonte lejano; puede estar `paused` y ser del horizonte
inmediato porque se retomará ya).

El objetivo de fondo del usuario es habilitar, **como trabajo futuro**, un
límite de tipo **"un `in_progress` por rol"**: restringir cuánto trabajo en
curso puede haber simultáneamente en el horizonte inmediato. Este spec **no
implementa ese límite**: solo introduce el dato que lo hará posible.

## Alcance

### Incluye

Un campo `horizon` en la entidad `Project`, expuesto en la API, en el MCP y en
la UI de proyectos (selector en el formulario, badge en la lista y filtro).

### Valores propuestos (el usuario no los definió — esta es la propuesta a aprobar)

```ts
// backend/src/common/enums/project-horizon.enum.ts
export enum ProjectHorizon {
  NOW = 'now',         // UI: "Ahora"      — el foco actual
  NEXT = 'next',       // UI: "Siguiente"  — lo que entra cuando se libere foco
  LATER = 'later',     // UI: "Después"    — comprometido, sin fecha cercana
  SOMEDAY = 'someday', // UI: "Algún día"  — idea viva, sin compromiso
}
```

**Justificación de la escala elegida (`now / next / later / someday`) frente a
una escala de calendario (`semana / mes / trimestre`):**

- Una escala de calendario **caduca sola**: un proyecto marcado "semana" queda
  mintiendo el lunes siguiente y obliga a un mantenimiento manual (o a un job)
  que el usuario ya rechazó explícitamente en el caso de `scheduledForToday`.
  Una escala **relativa** solo cambia cuando cambian las prioridades, que es
  justo cuando el usuario quiere revisarla.
- Es **compatible con el modelo de capas** que motiva todo el paquete: `now` es
  la Capa 2 (accionable ahora) a nivel proyecto, y `later`/`someday` son la
  Capa 1 (diferido) — el mismo eje que `deferUntil` introduce en spec-030.
- `now` es **escaso por definición**, que es exactamente lo que necesita el
  futuro límite de "un `in_progress` por rol". Una escala de calendario no
  transmite escasez.
- `someday` separa "lo haré, todavía no" de "quizá nunca", que hoy se mezclan
  en `inactive`.

**Valores de código en inglés, etiquetas en español**: es la convención vigente
en todos los enums del proyecto (`ProjectStatus`, `ActivityStatus`, `Priority`,
`Energy` usan valores en inglés; solo los enums financieros del dominio local
—`basico`, `lujo`— están en español). Las etiquetas visibles se traducen en el
frontend, como ya hace `STATUS_LABELS` en `ProjectList.tsx`.

### Default propuesto: `next`

- No puede ser `now`: el default entraría automáticamente en el horizonte
  escaso y lo vaciaría de significado desde el primer día (y desactivaría de
  entrada el futuro límite de WIP).
- No puede ser `someday`: degradaría de golpe todos los proyectos existentes, que
  **sí** están vivos, y obligaría a re-triaje completo para volver al estado real.
- `next` es el punto neutro: "está en el radar, no es el foco". Es también el
  backfill honesto para los proyectos existentes, que el usuario puede promover
  a `now` uno a uno.
- Columna **`NOT NULL`** con default: un horizonte nulo sería un tercer estado
  implícito ("sin clasificar") que nadie limpiaría.

### Lo que NO incluye

- **No implementa el límite de "un `in_progress` por rol"** ni ninguna
  validación, advertencia o bloqueo derivada de `horizon`. Trabajo futuro.
- **No introduce el concepto de "rol"** en el modelo.
- **No agrega `horizon` a `Activity`.** El horizonte es una propiedad del
  proyecto; las actividades lo heredan por pertenencia, no por copia.
- **No agrega endpoints nuevos.** El filtrado por horizonte en la UI se resuelve
  en cliente, reutilizando el patrón del filtro por `status` ya existente en
  `ProjectList.tsx`.
- **No ordena ni prioriza** listas por horizonte (el orden actual no cambia).
- **No incluye `size`** en `Activity`: fuera de alcance de todo el paquete
  027–032, a la espera de datos reales de `energy`.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `common/enums/project-horizon.enum.ts` | **Nuevo** — enum `ProjectHorizon` |
| `projects/entities/project.entity.ts` | Nueva columna `horizon` (`enum`, `NOT NULL`, default `NEXT`) |
| `projects/dto/create-project.dto.ts` | Nueva prop opcional `horizon` con `@IsEnum(ProjectHorizon)` + `@ApiPropertyOptional` |
| `projects/dto/update-project.dto.ts` | Sin cambios (`PartialType`) |
| `projects/projects.service.ts` | Sin lógica nueva: el campo se asigna por `Object.assign`/`create` como los demás. Verificar que ninguna consulta con `select` explícito lo omita |
| `projects/projects.controller.ts` | Sin cambios (no se agrega filtro por query param) |
| `migrations/1787000000002-AddHorizonToProjects.ts` | **Nueva migración** |

### Base de datos

**Migración `1787000000002-AddHorizonToProjects.ts`** — **agrega** columna y tipo
enum, no elimina nada:

- `up()`:
  - `CREATE TYPE "public"."projects_horizon_enum" AS ENUM('now','next','later','someday')`
  - `ALTER TABLE "projects" ADD COLUMN "horizon" "public"."projects_horizon_enum" NOT NULL DEFAULT 'next'`
- El default se encarga del backfill: **todos los proyectos existentes quedan en
  `next`** sin necesidad de un `UPDATE` adicional.
- `down()`: `DROP COLUMN "horizon"` + `DROP TYPE "public"."projects_horizon_enum"`.

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Nuevo const/type `ProjectHorizon` (mismo patrón que `ProjectStatus`, líneas ~1-9); agregar `horizon: ProjectHorizon` a `Project` y `horizon?: ProjectHorizon` a `CreateProjectDto` |
| `components/ProjectForm.tsx` | Nuevo `<select>` "Horizonte" junto al de "Estado" (~líneas 60-67), con `horizon: z.nativeEnum(ProjectHorizon).optional()` en el esquema (~línea 8) y `defaultValue` `initial?.horizon ?? ProjectHorizon.NEXT` (~línea 39) |
| `pages/ProjectList.tsx` | `HORIZON_LABELS: Record<ProjectHorizon, string>` (patrón de `STATUS_LABELS`, ~línea 11); estado `filterHorizon` análogo a `filterStatus` (~línea 35); chips/selector de filtro (~línea 95); mostrar el horizonte en cada tarjeta de proyecto |
| `pages/ProjectDetail.tsx` | Mostrar el horizonte del proyecto junto a su estado |
| `components/StatusBadge.tsx` | **Decisión:** no ampliar este componente (hoy tipa `ActivityStatus \| ProjectStatus`); el horizonte se renderiza como badge propio para no mezclar dos ejes distintos en un mismo componente |
| `hooks/useProjects.ts` / `services/projects.service.ts` | Sin cambios: `horizon` viaja dentro de los DTO existentes. Las mutations ya invalidan `['projects']` |

> **Leer `frontend/DESIGN.md` antes de tocar la UI.** El badge de horizonte
> necesita cuatro variantes visuales; deben salir de los tokens semánticos
> existentes. **Si hiciera falta un token de color nuevo, se propone al usuario
> por separado y no se da por aprobado dentro de este spec.**

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

- `create_project` y `update_project`: nuevo parámetro opcional `horizon`.
- `list_projects` / `get_project`: el payload incluye `horizon`; evaluar si
  conviene un filtro por horizonte en la tool de listado.
- `docs/mcps/asistente-personal.system-prompt.md`: documentar el eje nuevo, su
  diferencia con `status` y **que hoy no impone ninguna restricción**, para que
  el agente no invente reglas de WIP que no existen.

## Evaluación MCP

**¿Aplica MCP?** **Sí.** `horizon` es un dato que un agente de productividad
usaría para priorizar o agrupar proyectos ("¿qué proyectos son de largo
plazo?"), con el mismo patrón que cualquier campo nuevo de `Project`.

- **MCP existente a modificar:** `todo-api`.

**Tools a modificar:**

| Tool | Cambio en su schema Zod |
|---|---|
| `create_project` | Agregar `horizon: z.enum(['now','next','later','someday']).optional().describe(...)`. Verificar contra `CreateProjectDto` real si termina siendo opcional (con default `next` en la entidad) o si conviene declararlo explícitamente |
| `update_project` | Agregar `horizon: z.enum([...]).optional().describe('New horizon')` |
| `get_project` | Sin cambio de schema — el output ya trae la entidad completa, incluye `horizon` automáticamente |
| `list_projects` | **No** se agrega filtro por `horizon` en este spec — mismo criterio que "Lo que NO incluye" del spec (no ampliar scope sin pedirlo explícitamente). Reevaluar si el volumen de proyectos lo justifica más adelante |

**Tools a eliminar / crear:** ninguna.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` — agregar `horizon` a "Modelo de datos → Proyectos" con sus 4 valores y etiquetas, actualizar `create_project`/`update_project` en la tabla de tools, y documentar explícitamente que **hoy no impone ninguna restricción** (para que el agente no invente reglas de límite de WIP que todavía no existen).

**Fase de MCP en este spec:** Fase 3 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend
- [x] Crear `common/enums/project-horizon.enum.ts`
- [x] `project.entity.ts`: columna `horizon` (`NOT NULL`, default `NEXT`)
- [x] `create-project.dto.ts`: prop opcional `horizon` validada con `@IsEnum`
- [x] Verificar que `projects.service.ts` devuelve el campo en todas sus
      consultas — sin `select` restrictivo en ninguna, no requirió cambios
- [x] `npm run build` y `npm run lint` en `backend/` — ambos limpios

### Fase 2 — Migración
- [x] Crear `migrations/1787000000002-AddHorizonToProjects.ts` (CREATE TYPE +
      ADD COLUMN con default `next`)
- [x] Ejecutar en local y verificar que los proyectos existentes quedaron en
      `next` — confirmado: 10/10 proyectos existentes en `next`

### Fase 3 — MCP: actualizar `todo-api`
- [x] Agregar `horizon` a `create_project` y `update_project`
- [x] Evaluar filtro por horizonte en la tool de listado de proyectos — no se
      agrega, ya decidido en "Decisiones ya resueltas"
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` — sección
      "Proyectos" con los 4 valores, etiquetas y aclaración explícita de que
      no impone restricciones hoy
- [x] Actualizar `docs/mcps/README.md` — sin cambios necesarios (no enumera
      campos)
- [x] Verificar que el MCP responde correctamente a las herramientas
      declaradas — backend local: `create_project` con `horizon: "now"` lo
      persiste tal cual

### Fase 4 — Frontend
- [x] Leer `frontend/DESIGN.md`
- [x] `types/index.ts`: `ProjectHorizon` + campos en `Project` y `CreateProjectDto`
- [x] `ProjectForm.tsx`: selector "Horizonte" con default `next`
- [x] `ProjectList.tsx`: etiquetas en español, badge y filtro por horizonte
      (client-side, mismo patrón que el filtro de `status`); nuevo componente
      `HorizonBadge.tsx` (badge propio, no se amplió `StatusBadge` — colores
      dentro de los tokens ya documentados en `DESIGN.md`, sin token nuevo)
- [x] `ProjectDetail.tsx`: mostrar el horizonte
- [x] `npm run lint` y `npm run build` en `frontend/` — ambos limpios

### Fase 5 — Pruebas
- [x] `docs/testing/test-029-horizonte-de-proyecto.md` con casos `TC-029-xx` y
      `TC-MCP-029-xx` (redactado junto con el spec; pendiente de ejecución
      manual por el usuario)
- [x] `backend/test/e2e-029-horizonte-de-proyecto.e2e-spec.ts` — 14/14 en
      verde
- [x] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`) —
      sin regresiones fuera de alcance (specs 030-032 aún no implementados)

## Criterios de aceptación

- `POST /projects` sin `horizon` crea el proyecto con `horizon: 'next'`.
- `POST /projects` con `horizon: 'now'` lo persiste tal cual.
- `POST /projects` con `horizon: 'urgente'` (valor inválido) responde **400**.
- `PATCH /projects/:id` puede mover un proyecto entre los cuatro horizontes.
- `horizon` y `status` son **independientes**: un proyecto puede quedar
  `status: 'paused'` + `horizon: 'now'` sin ningún error ni advertencia.
- Todos los proyectos existentes antes de la migración quedan en `horizon: 'next'`.
- `GET /projects` devuelve `horizon` en cada proyecto.
- El formulario de proyecto muestra el selector de horizonte con "Siguiente"
  preseleccionado al crear.
- La lista de proyectos permite filtrar por horizonte y el badge muestra la
  etiqueta en español.
- **Ningún** flujo se bloquea por tener varios proyectos en `now` ni por tener
  varias actividades `in_progress`.
- El agente puede invocar `create_project` con `horizon` y obtener el proyecto
  creado con ese valor.

## Pruebas asociadas

- **Manuales:** `docs/testing/test-029-horizonte-de-proyecto.md` — casos
  `TC-029-xx` (selector, default, filtro, badge, independencia de `status`) y
  `TC-MCP-029-xx`.
- **Automáticas (backend):** `backend/test/e2e-029-horizonte-de-proyecto.e2e-spec.ts`.

## Decisiones ya resueltas con el usuario

1. **Los cuatro valores del enum aprobados tal cual:** `now / next / later /
   someday` ("Ahora / Siguiente / Después / Algún día"). Alternativa descartada:
   escala de calendario (`semana / mes / trimestre`), por caducar sola.
2. **Default `next` aprobado** — todos los proyectos existentes quedan en
   `next` vía el `DEFAULT` de la migración, sin `UPDATE` adicional.
3. **Sin filtro por `horizon` en la API** (`GET /projects?horizon=`) por ahora
   — se resuelve en cliente, mismo patrón que el filtro por `status` ya
   existente en `ProjectList.tsx`. Se reevalúa si el volumen de proyectos lo
   justifica.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-17

## Cierre de la ronda de pruebas (2026-08-16)

- **Manuales:** 13/14 casos aprobados (`TC-029-001` a `TC-029-009`,
  `TC-MCP-029-001` a `TC-MCP-029-004`). `TC-029-010` queda diferido a la
  ventana de despliegue (requiere datos legacy reales previos a la
  migración). Nota de transparencia: en `TC-029-008` los proyectos PROJ-I/J
  no se encontraron por API al verificar; el usuario confirmó explícitamente
  aprobar el caso igual — documentado en el propio caso de
  `docs/testing/test-029-horizonte-de-proyecto.md`.
- **Automáticas:** confirmadas por `@tester` — `e2e-029-horizonte-de-proyecto.e2e-spec.ts`
  14/14, unit 105/105. Únicos fallos de la suite completa son 2 preexistentes
  y no relacionados (`app.e2e-spec.ts`, `auth.e2e-spec.ts` TC-014).
- Datos de prueba de la ronda eliminados y verificados `404` por API.
- Spec marcado como `[DONE]`.
