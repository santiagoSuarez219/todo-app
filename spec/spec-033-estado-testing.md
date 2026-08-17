# spec-033 — [TESTING] Estado `testing`: trabajo hecho, pendiente de probar

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Continuación del paquete "Actividades — modelo de capas"** (specs 027→032,
> todos `[DONE]`). Sigue el mismo patrón que **spec-032** (`waiting`), pero en
> su versión mínima: **solo un valor de enum, sin campos nuevos**.

## Contexto

En las actividades de desarrollo hay un punto intermedio que hoy no se puede
representar: el código ya está escrito, pero **todavía no se ha probado**. Con
el enum actual el usuario tiene que elegir entre dos etiquetas igualmente
incorrectas:

- `in_progress` — sugiere que sigue habiendo trabajo de construcción pendiente,
  cuando en realidad lo que falta es **verificar**.
- `completed` — miente: la actividad se saca de todas las vistas activas y deja
  de ser visible justo cuando lo que hace falta es acordarse de probarla.

El resultado práctico es que las tareas "hechas pero sin probar" se marcan
`completed` y el testing se olvida, o se dejan en `in_progress` y se confunden
con trabajo a medias. `testing` separa esas dos cosas: **construir** y
**verificar**.

Es el mismo criterio con el que spec-032 separó "lo pausé yo" (`on_hold`) de
"me bloquea un tercero" (`waiting`): no se trata de crear estados por gusto,
sino de que el estado dispare la acción correcta. En `testing`, la acción es
probar.

## Alcance

### Incluye

- Un valor nuevo en el enum `ActivityStatus`: **`testing`**.
- Su exposición completa en API REST, MCP y UI (badge, formulario, edición
  rápida desde la card).
- La migración que amplía el tipo enum de Postgres.

### Decisiones tomadas con el usuario

- **Disponible en cualquier actividad**, no solo en las de proyectos de
  desarrollo. No se introduce ningún concepto de "proyecto de desarrollo" ni
  validación que restrinja el estado por proyecto: es un valor más del enum y
  el usuario decide dónde tiene sentido usarlo. Mismo criterio que `waiting`.
- **Sin campos asociados.** A diferencia de `waiting` (`waitingFor`,
  `waitingSince`), `testing` no lleva metadatos. No hay `testingSince` ni notas
  de prueba. Esto hace que el spec **no toque la lógica de
  `create()`/`update()`**: no hay ciclo de vida que autocompletar ni limpiar.
- **`testing` es un estado activo previo a `completed`.** Flujo esperado:
  `in_progress` → `testing` → `completed`. Cuenta como pendiente en Hoy /
  Semana / Vencidas / Backlog / Cronograma, exactamente igual que `on_hold` y
  `waiting`. **Ninguna consulta cambia su `WHERE`.**
- **`testing` no reemplaza a ningún estado existente** y **ninguna actividad se
  migra automáticamente**: la migración no cambia el estado de ninguna fila.

### Lo que NO incluye

- **No crea una vista ni un filtro "Por probar"**. La consulta ya queda
  disponible sin código nuevo (`GET /activities/status/testing` funciona con el
  enum ampliado), pero una vista dedicada es trabajo futuro.
- **No agrega campos** de ningún tipo (`testingSince`, notas, resultado de la
  prueba, enlace a un test). Si más adelante hace falta "lleva N días sin
  probar", será un spec aparte.
- **No agrega alertas ni recordatorios** por antigüedad en `testing`.
- **No introduce transiciones obligatorias**: nada impide ir de `pending`
  directo a `completed`, ni volver de `testing` a `in_progress`. El enum no
  modela una máquina de estados.
- **No toca el comportamiento de ningún estado existente** ni sus etiquetas.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `common/enums/activity-status.enum.ts` | Agregar `TESTING = 'testing'` **entre `IN_PROGRESS` y `COMPLETED`** (el orden del enum es el orden del selector en el formulario, ver Frontend). Queda: `pending`, `in_progress`, `testing`, `completed`, `cancelled`, `on_hold`, `waiting` |
| `activities/entities/activity.entity.ts` | **Sin cambios** — la columna `status` ya es del tipo enum y no se agregan campos |
| `activities/dto/create-activity.dto.ts` | **Sin cambios** — `status` ya valida con `@IsEnum(ActivityStatus)`, así que acepta `testing` automáticamente |
| `activities/activities.service.ts` | **Sin cambios.** Verificar por lectura que: (a) las vistas activas comparan contra `COMPLETED` y no enumeran estados "activos" a mano (confirmado en spec-032, reconfirmar); (b) la cascada de subtareas de spec-024 y el `completedAt` de spec-028 solo reaccionan a transiciones hacia/desde `completed`, de modo que entrar o salir de `testing` no los dispara |
| `activities/activities.controller.ts` | **Sin cambios** — `GET /activities/status/:status` usa el enum |
| `activities/activities.service.spec.ts` | Casos nuevos: `testing` no dispara la cascada de subtareas; `completed → testing` limpia `completedAt` |
| `migrations/1787000000006-AddTestingToActivities.ts` | **Nueva migración** |

> El único riesgo real del spec está en la migración; el resto del backend es
> aditivo puro.

### Base de datos

**Migración `1787000000006-AddTestingToActivities.ts`** — amplía el tipo enum
`activities_status_enum` (nombre confirmado en spec-032 vía `\dT+`) siguiendo
**exactamente el mismo patrón** que `1787000000005-AddWaitingToActivities.ts`,
porque `ALTER TYPE … ADD VALUE` no es utilizable dentro de la transacción de la
migración:

1. `CREATE TYPE "activities_status_enum_new" AS ENUM('pending','in_progress','testing','completed','cancelled','on_hold','waiting')`
2. `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`
3. `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "activities_status_enum_new" USING "status"::text::"activities_status_enum_new"`
4. `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'pending'`
5. `DROP TYPE "activities_status_enum"` + `RENAME` del nuevo al nombre original

- **Sin columnas nuevas** y **sin backfill**: ninguna actividad cambia de
  estado.
- `down()`: revierte el enum a los 6 valores actuales. **Convierte antes las
  filas en `testing` a `in_progress`** (no a `on_hold`: lo contrario de
  "probado" es "en construcción", no "pausado"); si no, el `USING` falla al no
  poder mapear el valor. Es una degradación con pérdida de información y debe
  quedar documentada en el propio archivo, igual que en spec-032.

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Agregar `TESTING: 'testing'` al const `ActivityStatus` (líneas ~19-27), **en la misma posición que en el enum del backend** (tras `IN_PROGRESS`) |
| `components/StatusBadge.tsx` | Entrada nueva en `colorMap` y en `labelMap`. Etiqueta: **"En pruebas"** (no colisiona con "En progreso", "En pausa" ni "Esperando"). Color: **red** (`bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300`) — decidido con el usuario durante la implementación: es el único color de la paleta primitiva de `DESIGN.md` (gray/blue/green/red/yellow/purple/pink) sin usar todavía por otro estado (pending=yellow, in_progress=blue, completed=green, cancelled=gray, on_hold=purple, waiting=pink); agregar un color nuevo (teal) requería ampliar la paleta primitiva y quedó descartado para no tocar el sistema de diseño fuera de este spec |
| `components/ActivityForm.tsx` | Solo agregar la etiqueta a `STATUS_LABELS` (~línea 76): el `<select>` (~línea 253) itera `Object.values(ActivityStatus)`, así que la opción aparece sola y en la posición que dicte el orden del const |
| `components/ActivityCard.tsx` | Agregar `{ value: 'testing', label: 'En pruebas', dot: 'bg-red-500' }` a `STATUS_OPTIONS` (~línea 129), entre `in_progress` y `completed`. **Sin chip nuevo**: al no haber campos asociados, no hay nada extra que mostrar en la card |
| `pages/*`, `hooks/`, `services/` | Sin cambios esperados. Verificar con `npx tsc -b` que ningún `Record<ActivityStatus, …>` quede incompleto (en spec-032 no existía ninguno tipado estrictamente; reconfirmar) |

> **Leer `frontend/DESIGN.md` antes de tocar la UI.** El color debe salir de
> los tokens semánticos existentes. **Si hiciera falta un token nuevo, se
> propone al usuario aparte y no se da por aprobado dentro de este spec.**

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

Tres tools declaran el enum de `status` a mano en su schema Zod y hay que
ampliarlas de 6 a 7 valores. Ver "Evaluación MCP".

## Evaluación MCP

**¿Aplica MCP?** **Sí.** Agrega un valor al enum `status`, que está hardcodeado
en `z.enum([...])` en tres tools. Sin este cambio, el agente recibiría un error
de validación al intentar poner una actividad en `testing` o al consultarlas, y
el estado sería invisible para él.

- **MCP existente a modificar:** `todo-api`. **No se crea ningún MCP nuevo.**

**Tools a modificar:**

| Tool | Cambio en su schema Zod |
|---|---|
| `create_activity` (~línea 270) | Ampliar el `z.enum([...])` de `status` con `'testing'`. Extender el `.describe()` con: *"'testing' means the work is done but not yet verified — it sits between in_progress and completed."* |
| `update_activity` (~línea 343) | Mismo ajuste del enum y misma extensión del `.describe()` |
| `get_activities_by_status` (~línea 600) | Ampliar el `z.enum([...])` con `'testing'` |

**Tools a crear / eliminar:** ninguna. `get_activities_by_status('testing')`
responde "¿qué tengo pendiente de probar?" sin necesidad de una tool dedicada.
`create_recurring_activity` no expone `status` (confirmado en spec-032), así
que no requiere cambios — reconfirmar antes de cerrar la fase.

**System prompt afectado:**
`docs/mcps/asistente-personal.system-prompt.md`

- Agregar `testing` al listado de valores de `status` en "Campos comunes".
- Nota de desambiguación, en la línea de la que ya existe para
  `on_hold` vs `waiting`: *"`testing` significa que el trabajo está hecho pero
  falta verificarlo; no es sinónimo de `in_progress` (todavía se está
  construyendo) ni de `completed` (ya verificado). No marcar algo como
  `completed` si solo está pendiente de probar."*
- Flujo frecuente nuevo: "¿Qué tengo pendiente de probar?" →
  `get_activities_by_status('testing')`.

> ⚠️ `docs/mcps/asistente-personal.system-prompt.md` tiene cambios sin commitear
> en el working tree al momento de redactar este spec (+490/−192). Resolver esa
> situación **antes** de ejecutar la Fase 4, para no mezclar ediciones.

**Fase de MCP en este spec:** Fase 4.

## Fases de implementación

### Fase 1 — Backend: enum
- [x] `activity-status.enum.ts`: agregar `TESTING = 'testing'` tras `IN_PROGRESS`
- [x] Verificar por lectura que ninguna consulta de `activities.service.ts`
      enumera estados "activos" a mano, y que la cascada de spec-024 y el
      `completedAt` de spec-028 solo reaccionan a `completed` — confirmado:
      todas las comparaciones son contra `COMPLETED`, `PENDING`, `CANCELLED`
      o `WAITING`, ninguna enumera "activos" a mano
- [x] `npm run build` y `npm run lint` en `backend/` — build limpio, lint
      scoped sin hallazgos

### Fase 2 — Migración
- [x] Crear `migrations/1787000000006-AddTestingToActivities.ts` con el patrón
      `CREATE TYPE nuevo` + `ALTER COLUMN … USING` + `DROP TYPE` + `RENAME`
- [x] `down()` con conversión previa de `testing` → `in_progress`, documentada
- [x] Ejecutar en local y verificar con un conteo por estado antes/después que
      ninguna actividad cambió de estado — snapshot idéntico (66 pending,
      1 in_progress, 22 completed, 1 cancelled, 1 on_hold, 2 waiting); enum
      ahora incluye `testing` (`\dT+` confirmado)

### Fase 3 — Pruebas automáticas del backend
- [x] Poner en verde `backend/test/e2e-033-estado-testing.e2e-spec.ts` —
      14/14 en verde solo con el enum + la migración, sin tocar el servicio
- [x] Poner en verde los casos nuevos de `activities.service.spec.ts` — 4
      casos agregados (no dispara cascada, no fija completedAt, `completed →
      testing` limpia completedAt sin revertir la cascada, `testing →
      completed` sí dispara la cascada normal); 75/75 en el archivo
- [x] `npm run test`: 109/109. `npm run test:e2e`: 166/168 — únicos 2 fallos
      son los preexistentes ya confirmados en spec-032 (`app.e2e-spec.ts`,
      `auth.e2e-spec.ts` TC-014), sin relación con esta rama

### Fase 4 — MCP: actualizar `todo-api`
- [x] Ampliar el `z.enum` de `status` en `create_activity`, `update_activity`
      y `get_activities_by_status`, y extender sus `.describe()`
- [x] Reconfirmar que `create_recurring_activity` no expone `status` —
      confirmado, sin `status` en su schema
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` — nota de
      desambiguación `testing` vs `in_progress`/`completed` en "Campos
      comunes" y flujo frecuente "¿Qué tengo pendiente de probar?"
      (`get_activities_by_status(testing)`). Resuelto antes el cambio previo
      sin commitear del archivo (commit `6882a86`, aparte de este spec)
- [x] Revisar si `docs/mcps/README.md` requiere cambios — no, no enumera
      campos (igual que en spec-032)
- [x] Verificar contra el backend local que el MCP acepta `testing` en las
      tres tools: `create_activity` con `status: testing` la crea,
      `get_activities_by_status(testing)` la recupera, `update_activity` la
      transiciona a `in_progress`; dato de prueba eliminado y verificado

### Fase 5 — Frontend
- [x] Leer `frontend/DESIGN.md`
- [x] `types/index.ts`: agregar `TESTING` (entre `IN_PROGRESS` y `COMPLETED`)
- [x] `StatusBadge.tsx`: color `red` (decidido con el usuario, ver Frontend
      arriba) y etiqueta "En pruebas"
- [x] `ActivityForm.tsx`: etiqueta en `STATUS_LABELS`
- [x] `ActivityCard.tsx`: opción en `STATUS_OPTIONS` (`bg-red-500`)
- [x] `npx tsc -b` limpio (ningún `Record<ActivityStatus, …>` incompleto,
      igual que en spec-032); `npm run lint` — 4 errores preexistentes sin
      relación (`Login.tsx`, `ExpensesView.tsx`, `auth.service.ts`),
      confirmados idénticos con `git stash`; `npm run build` limpio

### Fase 6 — Cierre de pruebas
- [ ] El usuario ejecuta los casos manuales de
      `docs/testing/test-033-estado-testing.md`
- [ ] `@tester` ejecuta `npm run test` y `npm run test:e2e` y reporta

## Criterios de aceptación

- `PATCH /activities/:id` con `status: 'testing'` devuelve 200 y la actividad
  queda en `testing`.
- `POST /activities` con `status: 'testing'` crea la actividad en ese estado.
- `GET /activities/status/testing` devuelve solo las actividades en `testing`.
- Una actividad en `testing` con `dueDate` de hoy aparece en
  `GET /activities/today`; si su `dueDate` está vencido, aparece en
  `GET /activities/overdue`; y aparece en `GET /activities/this-week` y en el
  cronograma según su fecha. Es decir: **`testing` no oculta la actividad de
  ninguna vista activa.**
- `PATCH` con un `status` inexistente (p. ej. `'tested'`) sigue devolviendo 400.
- Pasar una actividad con subtareas pendientes a `testing` **no** completa sus
  subtareas (la cascada de spec-024 solo reacciona a `completed`).
- `completed → testing` deja `completedAt` en `null` (spec-028) y **no**
  revierte las subtareas que la cascada había completado.
- Tras la migración, el conteo de actividades por estado es idéntico al previo.
- El badge muestra "En pruebas" con un color distinguible de `in_progress` y
  `completed`; el formulario ofrece el estado y la edición rápida de la card
  también.
- El agente puede invocar `update_activity` con `status: 'testing'` y luego
  recuperar la actividad con `get_activities_by_status('testing')`.

## Pruebas asociadas

> Estos archivos se crean junto con el spec.

- **Manuales:** `docs/testing/test-033-estado-testing.md` — casos `TC-033-xx`
  (badge, formulario, edición rápida desde la card, presencia en las vistas
  activas) y `TC-MCP-033-xx`.
- **Automáticas (backend):** `backend/test/e2e-033-estado-testing.e2e-spec.ts`
  (en rojo desde su redacción: falla hasta que el enum incluya `testing`) +
  casos nuevos en `backend/src/activities/activities.service.spec.ts`.

## Decisiones ya resueltas (criterio de menor riesgo)

1. **Sin `testingSince`.** Se descartó deliberadamente: mantiene el spec en
   "un valor de enum" y evita tocar el ciclo de vida de `create()`/`update()`,
   que es donde vive la complejidad de spec-032. Si aparece la necesidad de
   "lleva N días sin probar", se agrega en un spec propio.
2. **Posición en el enum: entre `in_progress` y `completed`.** El formulario
   itera `Object.values(ActivityStatus)`, así que el orden del const **es** el
   orden que ve el usuario; colocarlo ahí refleja el flujo real y hace visible
   la diferencia con `completed` en el momento de elegir.
3. **`down()` degrada a `in_progress`, no a `on_hold`.** Lo contrario de
   "pendiente de probar" es "todavía en construcción".
4. **Etiqueta "En pruebas".** "Testing" en inglés rompería la consistencia de
   la UI, que está en español; "En prueba" (singular) se confunde con "En
   pausa" a golpe de vista.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-17
