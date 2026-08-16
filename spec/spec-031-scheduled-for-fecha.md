# spec-031 — [TESTING] De `scheduledForToday` (booleano) a `scheduledFor` (fecha)

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Depende de **spec-027**, **028**, **029**
> y **030** (`[DONE]`). Es el complemento simétrico de `deferUntil`: `deferUntil`
> dice *desde cuándo* aparece; `scheduledFor` dice *qué día quiero trabajarlo*.

## Contexto

`scheduledForToday` es un **booleano** (spec heredado `09`) que sirve para
empujar a la vista **Hoy** una actividad que por `dueDate` no tocaría hoy. Tiene
dos problemas de fondo:

1. **Es un estado con fecha implícita y sin dueño.** Un `true` de hace tres
   semanas sigue diciendo "hoy". Para que no mienta haría falta un job nocturno
   que lo limpie. **Verificado en el código: ese job no existe ni existió** — es
   decir, hoy el flag efectivamente arrastra actividades a la vista Hoy
   indefinidamente hasta que el usuario las completa o lo desmarca a mano.
2. **Solo sabe decir "hoy".** El usuario no puede planear para mañana ni para el
   jueves; tiene que esperar a que llegue el día y marcarlo entonces, que es
   justo el momento en que ya no le sirve planificar.

Convertirlo en una **fecha** (`scheduledFor`) resuelve ambos: la fecha caduca
sola (mañana ya no es hoy, sin job que la limpie) y permite planear cualquier día.

## Alcance

### Incluye

Sustituir `scheduledForToday: boolean` por `scheduledFor: date | null` en
`Activity`, con su migración, el filtrado de la vista Hoy, y la UI de
programación.

### Semántica (decisión tomada)

- `scheduledFor` es una **fecha de calendario** (`date`, nullable): "quiero
  trabajar esto ese día", independientemente de cuándo vence.
- **Vista Hoy:** una actividad aparece si `dueDate` cae hoy **o** si
  `scheduledFor = hoy` y no está `completed` — exactamente la regla actual, con
  la fecha en lugar del booleano.
- **Caduca sola:** si `scheduledFor` quedó en ayer y la actividad no se
  completó, mañana simplemente **deja de aparecer** por esa vía. No hay job, no
  hay limpieza, no hay dato que mienta. Si la actividad además está vencida por
  `dueDate`, seguirá apareciendo en **Vencidas** como siempre.
- **Interacción con `deferUntil` (spec-030):** el filtro de diferidas **manda**.
  Una actividad con `deferUntil` futura no aparece en Hoy aunque tenga
  `scheduledFor = hoy` — la condición de `deferUntil` se aplica fuera del
  paréntesis OR, tal como se definió en spec-030. Es coherente: si aún no puedo
  empezarla, no tiene sentido programarla para hoy.
- **Programar no es posponer:** cambiar `scheduledFor` **no** incrementa
  `postponementCount` (spec-028).

### Migración de datos: **drop + add con backfill**, no `RENAME`

Decisión y justificación:

- **No se puede castear `boolean` → `date`.** Un `ALTER COLUMN … TYPE date
  USING …` exigiría igualmente una expresión `CASE` completa, así que el
  supuesto ahorro del `RENAME` es nulo.
- Se hace explícito en tres pasos, todos dentro de la misma migración:
  1. `ADD COLUMN "scheduledFor" date` (nullable),
  2. **backfill** de las filas que hoy tienen el flag activo,
  3. `DROP COLUMN "scheduledForToday"`.
- **Backfill propuesto:**
  `UPDATE activities SET "scheduledFor" = CURRENT_DATE
   WHERE "scheduledForToday" = true AND status <> 'completed'`
  - **Por qué `CURRENT_DATE` y no `null`:** el flag `true` significa hoy "esta
    actividad quiero verla en Hoy". Traducirlo a la fecha de la migración
    conserva esa intención el día de la migración y deja que caduque sola al día
    siguiente, que es precisamente el comportamiento que este spec introduce. Si
    se dejara `null`, el usuario perdería de golpe su lista de "hoy" en el mismo
    momento de desplegar.
  - **Por qué excluir las completadas:** con el flag en `true` ya estaban
    excluidas de la vista Hoy por la condición `status != completed`; darles una
    fecha de programación sería inventar un dato que nunca se usó.
- **`down()`:** `ADD COLUMN "scheduledForToday" boolean NOT NULL DEFAULT false`,
  luego `UPDATE … SET "scheduledForToday" = ("scheduledFor" IS NOT NULL)` y
  `DROP COLUMN "scheduledFor"`. **Es lossy y debe documentarse en el propio
  archivo de migración**: la fecha exacta no se recupera y una programación
  futura se degrada a un `true` que significa "hoy".

### Lo que NO incluye

- **No agrega una vista "Planificado" ni un planificador semanal** (arrastrar
  tareas a días). El campo lo habilita; su UI es trabajo futuro.
- **No agrega un botón "programar para mañana"** más allá de lo descrito en el
  impacto de UI (ver "Decisiones a confirmar" sobre el alcance del control de la
  card).
- **No cambia `findTomorrow`, `findThisWeek`, `findOverdue` ni `findByMonth`**
  para tener en cuenta `scheduledFor` (ver "Decisiones a confirmar").
- **No introduce ningún job programado** de limpieza: la razón de ser del cambio
  es no necesitarlo.
- **No incluye `size`**: fuera de alcance de todo el paquete 027–032.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `activities/entities/activity.entity.ts` | Reemplazar `scheduledForToday: boolean` por `scheduledFor: string \| null` (`date`, nullable) |
| `activities/dto/create-activity.dto.ts` | Reemplazar la prop booleana `scheduledForToday` por `scheduledFor` opcional/nullable con `@IsDateString()`; revisar si `@IsBoolean` queda huérfano tras spec-027 |
| `activities/activities.service.ts` — `findToday()` (~399) | La rama del OR pasa de `activity.scheduledForToday = true AND status != completed` a `activity.scheduledFor = :today AND status != completed`, donde `:today` es `YYYY-MM-DD` local (`toDateOnlyString()`, mismo helper de spec-030). Se conserva la condición de `deferUntil` fuera del paréntesis |
| `activities/activities.service.ts` — `buildInstanceFromTemplate()` (~98) | `scheduledForToday: this.isToday(date)` pasa a `scheduledFor: <instanceDate>` (la instancia queda programada para su propio día) o a `null` — ver "Decisiones a confirmar" |
| `activities/activities.service.ts` — `isToday()` (~103) | Verificar si queda sin uso tras el cambio anterior; si sí, eliminarlo |
| `activities/activities.service.spec.ts` | Actualizar los casos que usan el booleano |
| `migrations/1787000000004-ReplaceScheduledForTodayWithScheduledForActivities.ts` | **Nueva migración** (add + backfill + drop) |

### Base de datos

**Migración `1787000000004-ReplaceScheduledForTodayWithScheduledForActivities.ts`**
— **agrega y elimina** columna en la misma migración:

- `up()`: `ADD COLUMN "scheduledFor" date` → `UPDATE` de backfill → `DROP COLUMN
  "scheduledForToday"`.
- `down()`: recrea el booleano, lo deriva de `scheduledFor IS NOT NULL` y borra
  la columna nueva (**lossy**, documentado en el archivo).
- Referencia histórica: la columna eliminada nació en
  `1782000000000-AddScheduledForTodayToActivities.ts` (spec heredado `09`).

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Quitar `scheduledForToday: boolean` de `Activity` (~línea 83) y de `CreateActivityDto` (~118); agregar `scheduledFor: string \| null` y `scheduledFor?: string \| null` |
| `components/ActivityCard.tsx` | El botón con ícono de sol hoy hace `PATCH { scheduledForToday: !valor }`. Pasa a alternar `scheduledFor` entre la fecha de hoy y `null`, manteniendo el mismo gesto de un clic. El estado "activo" del botón se calcula ahora con `scheduledFor === hoy`. Mostrar además la fecha cuando `scheduledFor` sea **futura** ("Programada para el {fecha}") |
| `components/ActivityForm.tsx` | Nuevo campo de fecha "Programar para", junto a "Fecha límite" y "Diferir hasta" (spec-030), con limpieza a `null` |
| `pages/TodayView.tsx` | Hoy separa la vista en "Programadas por fecha" (`dueDate` es hoy) y las del flag manual (`bySchedule`). Esa partición pasa a calcularse con `scheduledFor === hoy` en lugar del booleano; los títulos de sección se revisan para que sigan siendo correctos |
| `hooks/useActivities.ts` | Sin query keys nuevas; las mutations ya invalidan `['activities']` |
| `services/activities.service.ts` | Sin cambios: el campo viaja en los DTO existentes |

> **Leer `frontend/DESIGN.md` antes de tocar la card, el formulario y TodayView.**

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

- `create_activity` (~254) y `update_activity` (~287): el parámetro
  `scheduledForToday` (booleano) se **reemplaza** por `scheduledFor` (fecha,
  nullable en update).
- `create_recurring_activity`: revisar si expone el campo y aplicarle el mismo
  cambio.
- `get_today_activities`: su descripción actual dice literalmente *"by dueDate or
  scheduledForToday flag"* (~338) — debe reescribirse.
- `docs/mcps/asistente-personal.system-prompt.md`: es un cambio **de contrato**,
  no solo de nombre; el agente debe aprender a decir "prográmalo para el jueves".

## Evaluación MCP

**¿Aplica MCP?** **Sí.** `scheduledForToday` está expuesto hoy en
`create_activity`/`update_activity`, y `get_today_activities` lo documenta
como una de sus dos fuentes de datos — reemplazarlo rompe el contrato de esas
tools si no se actualiza en el mismo spec.

- **MCP existente a modificar:** `todo-api`.

**Tools a modificar:**

| Tool | Cambio en su schema Zod |
|---|---|
| `create_activity` | Reemplazar `scheduledForToday: z.boolean().optional()` por `scheduledFor: z.string().optional().describe('Schedule this activity to appear on a specific date view (ISO 8601 date)')` |
| `update_activity` | Reemplazar por `scheduledFor: z.string().nullable().optional().describe('Reschedule or clear (null) the scheduled date')` |
| `get_today_activities` | Actualizar descripción: pasa de "by dueDate or scheduledForToday flag" a "by dueDate or scheduledFor = today". Sin cambio de schema (no recibe input propio más allá de paginación) |
| `get_tomorrow_activities`, `get_this_week_activities` | **Sin cambio** — siguen mirando solo `dueDate`, no `scheduledFor`. Coherente con la decisión del spec de no ampliar el efecto de `scheduledFor` más allá de Hoy por ahora |
| `create_recurring_activity` | No expone `scheduledFor` — mismo criterio que `deferUntil` en spec-030, las instancias resuelven su propio valor en el servicio (`scheduledFor = instanceDate`) |

**⚠️ Riesgo de dependencia de un agente activo:** el system prompt actual documenta `scheduledForToday` explícitamente (booleano) y `get_today_activities` lo describe como una de sus dos fuentes. Un agente que envíe `scheduledForToday: true` tras este cambio fallará (parámetro inexistente, `forbidNonWhitelisted: true`). Mismo criterio de precaución que con `pay_debt_installment` en spec-026.

**Tools a eliminar / crear:** ninguna.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` — reemplazar `scheduledForToday` (boolean) por `scheduledFor` (fecha nullable) en "Campos comunes", con la explicación de que ya no es exclusivo de "hoy"; actualizar la descripción de `get_today_activities`; revisar cualquier mención a "marcar para hoy" en los flujos de creación y reemplazarla por la semántica de "programar para una fecha"; advertir que `scheduledFor` en el pasado no produce ningún efecto visible (caduca sola).

**Fase de MCP en este spec:** Fase 4 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend: modelo, DTO y vista Hoy
- [x] `activity.entity.ts`: `scheduledFor` (`date`, nullable) en lugar del booleano
- [x] `create-activity.dto.ts`: prop `scheduledFor` validada como fecha;
      `@IsBoolean` quedó huérfano tras el cambio y se eliminó su import
- [x] `findToday()`: nueva rama del OR con `scheduledFor = :today`, conservando
      la condición de `deferUntil` de spec-030
- [x] `buildInstanceFromTemplate()`: `scheduledFor = instanceDate` (opción A);
      `isToday()` quedó huérfano tras el cambio y se eliminó
- [x] `npm run build` y `npm run lint` en `backend/` — build limpio; unitarios
      de spec-031 6/6 en verde de entrada. Se corrigió además un test
      existente de spec-030 (ya `[DONE]`) que localizaba el bloque OR
      buscando el texto `scheduledForToday` — ahora `scheduledFor`, tal como
      preveía el checklist ("Actualizar los casos que usan el booleano")

### Fase 2 — Migración
- [x] Crear
      `migrations/1787000000004-ReplaceScheduledForTodayWithScheduledForActivities.ts`
- [x] `ADD COLUMN` + backfill (`CURRENT_DATE` para flags activos no completados)
      + `DROP COLUMN`
- [x] `down()` lossy, documentado en el archivo
- [x] Ejecutar en local y verificar que las actividades que estaban marcadas
      siguen apareciendo hoy en la vista Hoy — no había filas reales con
      `scheduledForToday = true` en la base local (0 filas), así que se
      insertaron 2 filas de prueba vía SQL de solo lectura/verificación
      (una `pending`, una `completed`, ambas con el flag en `true`) para
      ejercer el backfill; confirmado `pending → scheduledFor: CURRENT_DATE`,
      `completed → scheduledFor: null`, exactamente lo que pide el spec.
      Ambas filas de prueba se eliminaron después de verificar

### Fase 3 — Frontend
- [x] Leer `frontend/DESIGN.md`
- [x] `types/index.ts`: reemplazar el campo en `Activity` y `CreateActivityDto`
- [x] `ActivityCard.tsx`: botón de sol alternando `hoy` ↔ `null` + indicador
      "Programada para el {fecha}" cuando es futura (mismo criterio visual
      que el indicador de diferida de spec-030, con `fmtDateOnly()` para
      evitar el bug de parseo UTC)
- [x] `ActivityForm.tsx`: campo "Programar para" (tercera columna junto a
      Fecha límite y Diferir hasta)
- [x] `TodayView.tsx`: recalcular la partición `bySchedule` con
      `scheduledFor === hoy` (comparación local, no `toISOString()`)
- [x] `grep` de residuos de `scheduledForToday` en `frontend/src` — solo
      queda en un comentario explicativo de `types/index.ts`
- [x] `npm run lint` y `npm run build` en `frontend/` — ambos limpios

### Fase 4 — MCP: actualizar `todo-api`
- [x] Reemplazar `scheduledForToday` por `scheduledFor` en las tools de escritura
- [x] Reescribir la descripción de `get_today_activities`
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` — nueva
      explicación de `scheduledFor` en "Campos comunes" (ya no exclusivo de
      "hoy", caduca sola, independiente de `deferUntil`) y fila de tabla
      actualizada
- [x] Actualizar `docs/mcps/README.md` — sin cambios necesarios (no enumera
      campos)
- [x] Verificar que el MCP responde correctamente a las herramientas
      declaradas — backend local: `create_activity`/`update_activity` con
      `scheduledFor` en el schema, `scheduledForToday` ausente; smoke test:
      actividad creada con `scheduledFor` mañana no aparece en
      `get_today_activities` hoy

### Fase 5 — Pruebas
- [x] `docs/testing/test-031-scheduled-for-fecha.md` con casos `TC-031-xx` y
      `TC-MCP-031-xx` (redactado junto con el spec; pendiente de ejecución
      manual por el usuario)
- [x] `backend/test/e2e-031-scheduled-for-fecha.e2e-spec.ts` — 11/11 en
      verde. Se corrigió el mismo desajuste ya visto en spec-027/030: AC-07
      seguía esperando 201/200 (descarte silencioso) para
      `scheduledForToday`, cuando el propio spec ya documentaba 400
      (`forbidNonWhitelisted: true`)
- [x] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`) —
      unitarios de spec-031 6/6 en verde; suite completa sin regresiones
      (los 8 fallos restantes son todos de spec-032, aún no implementado)

## Criterios de aceptación

- Una actividad **sin** `dueDate` y con `scheduledFor = hoy` aparece en
  `GET /activities/today`.
- Con `scheduledFor = mañana`, **no** aparece hoy en la vista Hoy; **sí**
  aparecerá cuando esa fecha sea hoy (verificable creando una con
  `scheduledFor` = hoy y otra con = mañana).
- Con `scheduledFor = ayer` y sin `dueDate` de hoy, **no** aparece en Hoy (caduca
  sola, sin job).
- Con `scheduledFor = hoy` y `status: completed`, **no** aparece en Hoy.
- Con `scheduledFor = hoy` y `deferUntil` futura, **no** aparece en Hoy
  (spec-030 manda).
- `scheduledFor: null` en un `PATCH` desprograma la actividad.
- Tras la migración, las actividades que tenían `scheduledForToday = true` y no
  estaban completadas siguen apareciendo hoy en la vista Hoy; las completadas
  quedan con `scheduledFor: null`.
- La columna `scheduledForToday` ya no existe en la tabla; enviarla en el body
  responde **400** — `main.ts` fija `forbidNonWhitelisted: true` junto con
  `whitelist: true`, así que una propiedad no declarada en el DTO rechaza toda
  la petición en vez de descartarse en silencio (mismo criterio que spec-027).
- El botón de sol de la card sigue funcionando con un solo clic y refleja
  correctamente su estado activo/inactivo.
- Cambiar `scheduledFor` **no** modifica `postponementCount`.
- El agente puede invocar `update_activity` con `scheduledFor` en una fecha
  futura y la actividad no aparece en `get_today_activities` hasta ese día.

## Pruebas asociadas

- **Manuales:** `docs/testing/test-031-scheduled-for-fecha.md` — casos
  `TC-031-xx` (botón de sol, campo del formulario, secciones de TodayView,
  programación a futuro, caducidad, interacción con `deferUntil`) y
  `TC-MCP-031-xx`. Los datos con fechas de ayer/mañana se preparan por API.
- **Automáticas (backend):** `backend/test/e2e-031-scheduled-for-fecha.e2e-spec.ts`
  + actualización de los casos unitarios de `findToday()`.

## Decisiones ya resueltas con el usuario

1. **Backfill: `CURRENT_DATE` para las no completadas, confirmado.** Las
   actividades con `scheduledForToday = true` y `status != completed` reciben
   `scheduledFor = CURRENT_DATE`; las completadas quedan en `null` (ya estaban
   excluidas de Hoy por su propio status).
2. **Instancias recurrentes: opción A confirmada.** `scheduledFor =
   instanceDate` — cada instancia queda programada para su propio día. Preserva
   y mejora el comportamiento actual (las instancias futuras también quedan
   programadas para su día, cosa que hoy no pasa).
3. **`scheduledFor` no influye en otras vistas por ahora** (solo Hoy). Una vez
   que el campo acepta cualquier fecha, tendría sentido que la vista Semana
   también mostrara lo programado esa semana aunque no venza — se deja como
   trabajo futuro para no ampliar el scope de este spec.
4. **Alcance del control en la card: se mantiene el toggle de un clic** (hoy ↔
   `null`); la elección de otra fecha queda en el formulario, sin abrir un
   selector de fecha desde la card.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-17
