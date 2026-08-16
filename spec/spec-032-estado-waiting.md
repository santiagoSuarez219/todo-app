# spec-032 — [NOT STARTED] Estado `waiting`: bloqueado por otra persona (`waitingFor`, `waitingSince`)

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Depende de **spec-027** a **spec-031**
> (`[DONE]`). Es el **último** spec del paquete.

## Contexto

Hoy, cuando una tarea depende de otra persona —el contador que no manda el
documento, el proveedor que no responde, el amigo que tiene que confirmar—, el
usuario solo puede marcarla `on_hold`. Ahí se mezclan dos situaciones que no son
la misma:

- **`on_hold` = "lo pausé yo"**: decisión propia, sin urgencia, se retoma cuando
  el usuario quiera. La pelota está de su lado.
- **Bloqueado por un tercero**: el usuario **no puede** hacer nada; lo único
  accionable es **hacer seguimiento**. La pelota está del otro lado, y la
  información relevante es *quién* la tiene y *desde cuándo*.

Al colapsarlas, la app pierde justamente el dato que dispara la acción: "esto
lleva 12 días esperando a X". Este spec introduce `waiting` como estado propio,
con esos dos datos asociados.

## Alcance

### Incluye

- Un valor nuevo en el enum `ActivityStatus`: **`waiting`**.
- Dos campos nuevos en `Activity`: **`waitingFor`** (texto: persona o entidad) y
  **`waitingSince`** (fecha desde la que se espera).
- Su ciclo de vida automático en el servicio y su representación en la UI.

### Decisiones tomadas con el usuario

- **`waiting` COEXISTE con `on_hold`; no lo reemplaza.** `on_hold` conserva su
  significado ("lo pausé yo") y **ninguna** actividad existente se migra
  automáticamente a `waiting`: el usuario reclasificará a mano las que
  correspondan.
- **`waitingFor` y `waitingSince` solo tienen sentido con `status === 'waiting'`**
  y deben quedar en `null` en cualquier otro estado.
- **Limpieza automática, análoga a `completedAt` (spec-028):** al **salir** de
  `waiting` hacia cualquier otro estado, el servicio pone `waitingFor` y
  `waitingSince` en `null`. No es una cascada ni afecta a subtareas.
- **`waitingSince` se autocompleta:** al **entrar** en `waiting`, si el cliente
  no envía `waitingSince`, el servicio lo fija en la **fecha de hoy**. Si lo
  envía, se respeta (permite registrar "esto espera desde el día 3").
- **Datos incoherentes se limpian, no se rechazan:** enviar `waitingFor` con un
  `status` distinto de `waiting` **no** produce un 400; el servicio simplemente
  descarta esos valores. Es coherente con cómo el servicio ya normalizaba datos
  antes (el desaparecido `sanitizeByType` de spec-027) y evita romper clientes
  por un campo secundario. **`waitingFor` no es obligatorio** para entrar en
  `waiting`: se puede estar esperando sin saber a quién señalar.
- **`waiting` cuenta como estado activo** (no completado) en todas las vistas,
  exactamente igual que `on_hold` hoy: aparece en Hoy / Semana / Vencidas /
  Backlog según su `dueDate` y su `deferUntil` (spec-030). **Ninguna consulta
  cambia su `WHERE`.**

### Lo que NO incluye

- **No crea una vista/filtro "Esperando"** ni un panel de seguimiento. El dato
  queda disponible (`GET /activities/status/waiting` ya funciona con el enum
  nuevo, sin cambios de código), pero la vista dedicada es trabajo futuro.
- **No agrega alertas ni recordatorios** por antigüedad ("lleva 10 días
  esperando"). La card puede mostrar los días transcurridos, pero el sistema no
  actúa por ello.
- **No convierte `waitingFor` en una relación**: es texto libre, no una entidad
  "Persona" ni un catálogo de contactos.
- **No migra** ninguna actividad `on_hold` a `waiting`.
- **No cambia** el comportamiento de `on_hold`.
- **No incluye `size`**: fuera de alcance de todo el paquete 027–032.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `common/enums/activity-status.enum.ts` | Agregar `WAITING = 'waiting'` (queda: `pending`, `in_progress`, `completed`, `cancelled`, `on_hold`, `waiting`) |
| `activities/entities/activity.entity.ts` | Nuevas columnas `waitingFor: string \| null` (`varchar(255)`, nullable) y `waitingSince: string \| null` (`date`, nullable) |
| `activities/dto/create-activity.dto.ts` | Props opcionales `waitingFor` (`@IsString`, `@MaxLength(255)`) y `waitingSince` (`@IsDateString`), ambas nullable. `status` ya usa `@IsEnum(ActivityStatus)`, así que acepta `waiting` sin cambios |
| `activities/activities.service.ts` — `create()` (~182) | Si nace en `waiting` y no trae `waitingSince`, fijarlo a hoy; si **no** nace en `waiting`, forzar ambos campos a `null` |
| `activities/activities.service.ts` — `update()` (~225) | Con el `previousStatus` que ya se captura: al entrar en `waiting`, autocompletar `waitingSince` si falta; al salir de `waiting`, limpiar ambos campos; si el status resultante no es `waiting`, ignorar los valores entrantes |
| `activities/activities.service.ts` — consultas | **Sin cambios**: `waiting` es un estado activo más. Verificar que ninguna consulta enumere estados "activos" a mano (hoy todas comparan contra `COMPLETED`) |
| `activities/activities.controller.ts` | Sin cambios: `GET /activities/status/:status` usa el enum y admite `waiting` automáticamente |
| `activities/activities.service.spec.ts` | Casos de entrada/salida de `waiting` |
| `migrations/1787000000005-AddWaitingToActivities.ts` | **Nueva migración** |

**Interacción con spec-024 y spec-028:** entrar o salir de `waiting` **no**
dispara la cascada de subtareas ni toca `completedAt` (esos mecanismos solo
reaccionan a la transición hacia/desde `completed`). Un caso a cubrir en
pruebas: `completed → waiting` debe limpiar `completedAt` (por spec-028) y
autocompletar `waitingSince` (por este spec), en la misma llamada.

### Base de datos

**Migración `1787000000005-AddWaitingToActivities.ts`** — **agrega** dos columnas
y **amplía** un tipo enum:

- **Ampliación del enum:** `ALTER TYPE … ADD VALUE` es problemático dentro de la
  transacción en la que TypeORM ejecuta las migraciones (el valor nuevo no es
  utilizable en la misma transacción). Por eso se usa el patrón estándar que
  genera TypeORM para cambios de enum:
  1. `CREATE TYPE "activities_status_enum_new" AS ENUM('pending','in_progress','completed','cancelled','on_hold','waiting')`
  2. `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`
  3. `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "activities_status_enum_new" USING "status"::text::"activities_status_enum_new"`
  4. `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'pending'`
  5. `DROP TYPE "activities_status_enum"` y renombrar el nuevo al nombre original
- **Columnas nuevas:**
  - `ALTER TABLE "activities" ADD COLUMN "waitingFor" character varying(255)`
  - `ALTER TABLE "activities" ADD COLUMN "waitingSince" date`
- `down()`: elimina las dos columnas y revierte el enum. **Atención:** el
  `down()` fallará si existen filas con `status = 'waiting'`; debe convertirlas
  antes a `on_hold` y dejarlo documentado en el archivo (es una degradación con
  pérdida de información).
- **Sin backfill**: ninguna actividad cambia de estado por esta migración.
- Confirmar el nombre real del tipo enum de `status` en la base antes de
  escribir la migración (esperado por convención: `activities_status_enum`).

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Agregar `WAITING: 'waiting'` al const `ActivityStatus` (~líneas 11-18); agregar `waitingFor: string \| null` y `waitingSince: string \| null` a `Activity`, y sus equivalentes opcionales en `CreateActivityDto` |
| `components/StatusBadge.tsx` | Nueva variante visual y etiqueta "Esperando", distinguible de "En pausa" (`on_hold`) |
| `components/ActivityForm.tsx` | `waiting` en el selector de estado; campos condicionales "Esperando a" (texto) y "Esperando desde" (fecha) visibles solo cuando el estado seleccionado es `waiting` — mismo patrón `useWatch` que usaba la ramificación por tipo eliminada en spec-027; `waitingSince` con valor por defecto = hoy al seleccionar `waiting` |
| `components/ActivityCard.tsx` | La edición rápida de estado (spec-012) incorpora `waiting`; mostrar un chip "Esperando a {waitingFor} · hace {n} días" cuando el estado sea `waiting` |
| `pages/*` que enumeren estados | Revisar `ProjectDetail.tsx` y cualquier filtro/etiqueta de estado de actividad que use un `Record<ActivityStatus, …>`: TypeScript marcará los mapas incompletos, hay que completarlos |
| `hooks/useActivities.ts`, `services/activities.service.ts` | Sin cambios |

> **Leer `frontend/DESIGN.md` antes de tocar la UI.** `waiting` necesita un color
> propio que no se confunda con `on_hold`; debe salir de los tokens semánticos
> existentes. **Si hiciera falta un token nuevo, se propone al usuario aparte y
> no se da por aprobado dentro de este spec.**

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

- `create_activity` y `update_activity`: el enum de `status` incorpora
  `waiting`; parámetros nuevos `waitingFor` y `waitingSince` (nullable en
  `update_activity`).
- `get_activities_by_status`: acepta `waiting` (ajustar el enum del esquema Zod
  y su descripción).
- `create_recurring_activity`: revisar si expone `status`.
- `docs/mcps/asistente-personal.system-prompt.md`: explicar la diferencia entre
  `on_hold` y `waiting`, y que el agente debe preguntar **a quién** se espera al
  mover algo a `waiting`. Es el cambio de este spec con más valor para el agente:
  habilita preguntas como "¿qué estoy esperando de alguien hace más de una
  semana?".

## Evaluación MCP

**¿Aplica MCP?** **Sí.** Agrega un valor de enum a `status`, hardcodeado hoy
en `z.enum([...])` en al menos tres tools, más dos campos nuevos que un agente
necesitaría leer y escribir para gestionar el estado.

- **MCP existente a modificar:** `todo-api`.

**Tools a modificar:**

| Tool | Cambio en su schema Zod |
|---|---|
| `create_activity` | Ampliar el `z.enum([...])` de `status` de 5 a 6 valores (agregar `'waiting'`). Agregar `waitingFor: z.string().optional().describe('What/who this activity is waiting on — only meaningful when status is waiting')` y `waitingSince: z.string().optional().describe('Date since when this activity is waiting (ISO 8601) — only meaningful when status is waiting')` |
| `update_activity` | Mismo ajuste del enum. Agregar `waitingFor: z.string().nullable().optional()` y `waitingSince: z.string().nullable().optional()` (nullable para poder limpiarlos si el status cambia de `waiting` a otro) |
| `get_activities_by_status` | Ampliar el `z.enum([...])` con `'waiting'` |

**Tools a eliminar / crear:** ninguna — `get_activities_by_status('waiting')` (tool ya existente, solo con el enum ampliado) cubre la consulta "¿qué tengo en espera?" sin necesidad de una tool dedicada.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` — ampliar "Campos comunes" con el valor `waiting` y los dos campos nuevos; **distinción explícita `on_hold` vs. `waiting`**: agregar una nota del tipo *"`on_hold` es una pausa decidida por el usuario sin depender de un tercero; `waiting` es una espera activa sobre algo externo y debería llevar `waitingFor`. No usar `waiting` como sinónimo de pausar manualmente, ni `on_hold` cuando el bloqueo depende de otra persona o evento"* — evita que el agente elija el estado equivocado; agregar flujo "¿Qué tengo en espera?" / "¿Qué estoy esperando de X?" → `get_activities_by_status(waiting)`, presentando `waitingFor` en el resultado; si el flujo de creación permite elegir status, agregar `waiting` como opción y recopilar `waitingFor` al elegirla.

**Fase de MCP en este spec:** Fase 4 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend: enum, modelo y DTO
- [ ] `activity-status.enum.ts`: agregar `WAITING = 'waiting'`
- [ ] `activity.entity.ts`: columnas `waitingFor` y `waitingSince`
- [ ] `create-activity.dto.ts`: props opcionales validadas
- [ ] `npm run build` y `npm run lint` en `backend/`

### Fase 2 — Backend: ciclo de vida de `waiting`
- [ ] `create()`: autocompletar `waitingSince` si nace en `waiting`; forzar
      `null` en ambos campos si no
- [ ] `update()`: autocompletar al entrar, limpiar al salir, ignorar valores
      incoherentes
- [ ] Verificar que `waiting` no afecta la cascada de spec-024 ni `completedAt`
      de spec-028, y cubrir el caso `completed → waiting`
- [ ] Verificar que ninguna consulta trata `waiting` como estado terminal

### Fase 3 — Migración
- [ ] Confirmar el nombre real del tipo enum de `status` en la base
- [ ] Crear `migrations/1787000000005-AddWaitingToActivities.ts` (patrón
      `CREATE TYPE nuevo` + `ALTER COLUMN … USING` + `DROP TYPE` + `RENAME`,
      más las dos columnas)
- [ ] `down()` con conversión previa de `waiting` → `on_hold`, documentado
- [ ] Ejecutar en local y verificar que las actividades existentes conservan su
      estado

### Fase 4 — MCP: actualizar `todo-api`
- [ ] Ampliar el enum de `status` en las tools que lo declaran
- [ ] Agregar `waitingFor` / `waitingSince` a `create_activity` y `update_activity`
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md` (diferencia
      `on_hold` vs `waiting`)
- [ ] Actualizar `docs/mcps/README.md`
- [ ] Verificar que el MCP responde correctamente a las herramientas declaradas

### Fase 5 — Frontend
- [ ] Leer `frontend/DESIGN.md`
- [ ] `types/index.ts`: `WAITING` + los dos campos
- [ ] `StatusBadge.tsx`: variante "Esperando"
- [ ] `ActivityForm.tsx`: opción de estado + campos condicionales + default de
      `waitingSince`
- [ ] `ActivityCard.tsx`: `waiting` en la edición rápida + chip "Esperando a … ·
      hace N días"
- [ ] Completar los `Record<ActivityStatus, …>` que TypeScript señale
- [ ] `npm run lint` y `npm run build` en `frontend/`

### Fase 6 — Pruebas
- [ ] `docs/testing/test-032-estado-waiting.md` con casos `TC-032-xx` y
      `TC-MCP-032-xx`
- [ ] `backend/test/e2e-032-estado-waiting.e2e-spec.ts` en rojo
- [ ] Casos unitarios en `activities.service.spec.ts`
- [ ] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`)

## Criterios de aceptación

- `PATCH /activities/:id` con `status: 'waiting'` y sin `waitingSince` devuelve
  la actividad en `waiting` con `waitingSince` = hoy.
- Con `waitingSince` explícito, se respeta el valor enviado.
- `waitingFor` es opcional: se puede entrar en `waiting` sin indicar a quién.
- Salir de `waiting` hacia cualquier otro estado deja `waitingFor: null` y
  `waitingSince: null`.
- Enviar `waitingFor` con `status: 'pending'` **no** produce error y el campo
  queda en `null`.
- `on_hold` sigue funcionando exactamente igual y ninguna actividad existente
  cambió de estado tras la migración.
- Una actividad en `waiting` con `dueDate` de hoy aparece en
  `GET /activities/today`; si su `dueDate` está vencido, aparece en
  `GET /activities/overdue`.
- `GET /activities/status/waiting` devuelve solo las actividades en ese estado.
- `completed → waiting` limpia `completedAt` (spec-028) y fija `waitingSince`;
  las subtareas completadas por la cascada de spec-024 **no** se revierten.
- La card muestra el chip "Esperando a {persona}" y el badge distingue
  visualmente `waiting` de `on_hold`.
- El agente puede invocar `update_activity` con `status: 'waiting'` y
  `waitingFor`, y luego `get_activities_by_status` con `waiting` para recuperarla.

## Pruebas asociadas

- **Manuales:** `docs/testing/test-032-estado-waiting.md` — casos `TC-032-xx`
  (selector de estado, campos condicionales, badge y chip, limpieza al cambiar
  de estado, edición rápida desde la card, coexistencia con `on_hold`) y
  `TC-MCP-032-xx`.
- **Automáticas (backend):** `backend/test/e2e-032-estado-waiting.e2e-spec.ts` +
  casos unitarios en `backend/src/activities/activities.service.spec.ts`,
  incluyendo el caso de regresión `completed → waiting`.

## Decisiones ya resueltas (criterio de menor riesgo, ver justificación)

1. **`waitingSince` es `date`** (fecha de calendario), coherente con
   `deferUntil` y `scheduledFor`, y suficiente para calcular "hace N días" —
   sin necesidad de la hora exacta.
2. **Limpieza silenciosa, no error 400.** Enviar `waitingFor`/`waitingSince`
   con un estado distinto de `waiting` no rompe la llamada; el servicio
   descarta esos valores. Mismo criterio que usaba el desaparecido
   `sanitizeByType` de spec-027: normalizar en vez de rechazar por un campo
   secundario.
3. **Sin reclasificación automática de `on_hold`.** Ninguna actividad cambia
   de estado por esta migración; el usuario reclasifica a mano las que
   correspondan. Ya confirmado también al decidir que `waiting` coexiste con
   `on_hold` en vez de reemplazarlo.
4. **Orden en el selector de estado:** `waiting` se ubica **junto a**
   `on_hold` en `ActivityForm.tsx` (no al final de la lista), precisamente para
   que la diferencia entre ambos sea visible en el momento de elegir.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{fecha}}
