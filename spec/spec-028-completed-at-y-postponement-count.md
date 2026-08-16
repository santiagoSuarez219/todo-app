# spec-028 — [NOT STARTED] Trazabilidad de la actividad: `completedAt` y `postponementCount`

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Depende de **spec-027** (limpieza del
> modelo), que debe estar `[DONE]` antes de iniciar este.

## Contexto

Hoy la app sabe **qué** está completado, pero no **cuándo** se completó: el único
rastro es `updatedAt`, que cambia con cualquier edición posterior y por tanto no
sirve como fecha de cierre. Sin ese dato no se puede responder nada sobre
throughput ("¿cuántas tareas cerré esta semana?") ni construir ninguna vista de
histórico.

En paralelo, el usuario detecta un patrón que hoy es invisible: hay tareas que
arrastra semana tras semana empujando su `dueDate` hacia adelante. Su intención
futura es una **"regla de las 3 postergaciones"** (cuando una tarea se pospone
tres veces, algo pasa: se replantea, se parte o se descarta). Antes de decidir
qué hacer con esa señal hay que **medirla**. Este spec convierte la postergación
en un dato consultable y nada más.

Ambos campos son de **cálculo automático en el backend**: ningún cliente los
escribe y ninguno de los dos exige cambios de UI.

## Alcance

### Incluye

Dos columnas nuevas en `Activity`, ambas mantenidas por
`ActivitiesService.update()` y por tanto activas en los tres canales (UI, REST,
MCP):

- **`completedAt`** (`timestamptz`, nullable) — instante en que la actividad pasó
  a `completed`.
- **`postponementCount`** (`integer`, `NOT NULL DEFAULT 0`) — cuántas veces se
  ha pospuesto la actividad.

### Decisiones tomadas con el usuario

**`completedAt`**

- Se **setea a `now()`** en la **transición** hacia `completed`
  (`previousStatus !== 'completed' && saved.status === 'completed'`), exactamente
  el mismo disparador que la cascada de subtareas de spec-024.
- Se **limpia a `null`** en la transición **saliente** de `completed` hacia
  cualquier otro estado: si el usuario reabre la tarea, ya no está completada y
  la fecha de cierre deja de ser cierta.
- Guardar una actividad que **ya estaba** `completed` sin tocar su status **no**
  reescribe `completedAt` (se conserva el instante original).
- **Interacción con spec-024 (cascada de subtareas), que sigue vigente:**
  - Las subtareas completadas **por la cascada** también reciben `completedAt`
    en el mismo `UPDATE` masivo de `completeSubtaskTree()`. Si no, quedarían
    `completed` con `completedAt: null` — justo la inconsistencia que este spec
    viene a eliminar.
  - **La limpieza de `completedAt` NO es una cascada inversa.** Reabrir el padre
    limpia **solo el `completedAt` del padre**. Las subtareas siguen
    `completed` con su `completedAt` intacto, porque spec-024 definió la
    propagación como de **un solo sentido** y este spec **no la modifica**. Son
    dos mecanismos independientes: no confundirlos.

**`postponementCount`**

- **Definición precisa de "posponer":** en un `update()` sobre una actividad que
  **ya tenía `dueDate`**, se recibe un `dueDate` nuevo **estrictamente posterior**
  al que tenía. Solo en ese caso se incrementa en 1.
- **No se incrementa** cuando:
  - la actividad **no tenía** `dueDate` (primera asignación de fecha),
  - el nuevo `dueDate` es **anterior o igual** al actual (adelantar o reguardar),
  - el `dueDate` se **borra** (`null`),
  - se crea la actividad (`create()`), aunque nazca con `dueDate`,
  - cambia **cualquier otro campo**, incluido `deferUntil` (spec-030) y
    `scheduledFor` (spec-031). **Diferir no es posponer**: son señales distintas
    y por eso se miden por separado.
- **Comparación:** entre los dos valores de `dueDate` como instantes
  (timestamp), no como fechas de calendario. Tras spec-027 ya no hay
  truncamiento automático a medianoche, así que se comparan tal cual llegan.
- **Un incremento por `update()` como máximo**, aunque la llamada toque muchos
  campos.
- **Solo lo escribe el backend.** Ningún cliente puede fijar ni resetear el
  contador: `completedAt` y `postponementCount` **no se agregan** a
  `CreateActivityDto`/`UpdateActivityDto`, así que el `ValidationPipe`
  (`whitelist: true`) los descarta si llegan en el body. Sí se **devuelven** en
  todas las respuestas de actividad.

### Lo que NO incluye

- **Ninguna lógica de bloqueo, advertencia o badge por la "regla de las 3
  postergaciones".** Este spec solo produce el dato. Cualquier reacción del
  sistema al valor del contador es trabajo futuro.
- **Ningún cambio de UI.** No se muestra `completedAt` ni `postponementCount` en
  la card ni en el formulario. Solo se agregan a los tipos del frontend para que
  el contrato quede completo.
- **Ninguna vista de histórico ni métrica agregada** ("completadas esta semana",
  "top de tareas pospuestas"): requieren endpoints propios, fuera de alcance.
- **Ningún backfill de datos** (ver "Decisiones a confirmar").
- **No modifica la cascada de spec-024** en su comportamiento: mismo disparador,
  misma unidireccionalidad, mismos estados arrastrados.
- **No incluye `size`** (estimación de esfuerzo): fuera de alcance de todo el
  paquete 027–032, a la espera de que `energy` acumule datos reales.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `activities/entities/activity.entity.ts` | Agregar `completedAt: Date \| null` (`timestamptz`, nullable) y `postponementCount: number` (`integer`, default `0`) |
| `activities/activities.service.ts` — `update()` (~225) | Capturar `previousDueDate` junto al ya existente `previousStatus`, **antes** del `Object.assign`; tras resolver el nuevo estado: setear/limpiar `completedAt` en la transición e incrementar `postponementCount` si aplica la definición de "posponer" |
| `activities/activities.service.ts` — `completeSubtaskTree()` (~315) | El `UPDATE` masivo pasa a setear también `completedAt` junto a `status: COMPLETED` |
| `activities/activities.service.ts` — `create()` (~182) | Si se crea con `status: 'completed'`, decidir `completedAt` (ver criterios: se setea a `now()`, por coherencia); `postponementCount` queda en 0 |
| `activities/dto/create-activity.dto.ts` | **Sin cambios** — los campos son de solo lectura por diseño |
| `activities/activities.service.spec.ts` | Casos unitarios de transición y de conteo |
| `migrations/1787000000001-AddCompletedAtAndPostponementCountToActivities.ts` | **Nueva migración** |

> **Atención al orden dentro de `update()`:** hoy la propagación a instancias
> futuras de plantillas y la cascada de spec-024 ocurren **después** del primer
> `save()`, y la cascada hace un `findOne()` de refresco. El nuevo cálculo de
> `completedAt`/`postponementCount` debe quedar reflejado en el objeto que
> finalmente se devuelve, sin disparar un segundo `save()` innecesario ni
> perderse en el refresco posterior.

### Base de datos

**Migración `1787000000001-AddCompletedAtAndPostponementCountToActivities.ts`**
— **agrega** columnas, no elimina ninguna:

- `up()`:
  - `ALTER TABLE "activities" ADD COLUMN "completedAt" TIMESTAMP WITH TIME ZONE`
    (nullable, sin default)
  - `ALTER TABLE "activities" ADD COLUMN "postponementCount" integer NOT NULL DEFAULT 0`
- `down()`: `DROP COLUMN` de ambas.
- **Sin backfill** (ver "Decisiones a confirmar"): las actividades ya
  completadas quedan con `completedAt: null` y todas quedan con
  `postponementCount: 0`.

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Agregar `completedAt: string \| null` y `postponementCount: number` a la interfaz `Activity`. **No** agregarlos a `CreateActivityDto` (no son escribibles) |

Sin cambios en componentes, hooks, servicios ni query keys. No se toca
`frontend/DESIGN.md` ni se requiere lectura previa de diseño: este spec no tiene
superficie visual.

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

- `create_activity` / `update_activity`: **no** ganan parámetros de entrada
  (los campos son de solo lectura), pero **sus respuestas** ahora incluyen
  `completedAt` y `postponementCount`, igual que `get_activity`,
  `list_activities` y todas las tools de consulta.
- El system prompt debe documentar los dos campos como **derivados**, para que
  el agente no intente escribirlos y sepa interpretarlos (p. ej. responder
  "esta tarea la has pospuesto 4 veces").

## Evaluación MCP

**¿Aplica MCP?** **Sí.** Ambos campos son datos que un agente necesitaría
consultar ("¿cuánto llevo postergando esto?", reportes de cierre), aunque no
se reciban como input directo.

- **MCP existente a modificar:** `todo-api` — se exponen los campos en las
  respuestas existentes, **sin** agregarlos como input en ninguna tool de
  escritura.

**Tools a modificar:**

| Tool | Cambio |
|---|---|
| `get_activity`, `list_activities`, `get_today_activities`, `get_overdue_activities`, etc. | Sin cambio de schema Zod — el output se enriquece automáticamente al venir directo de la entidad |
| `create_activity` | **No** se agrega `completedAt` ni `postponementCount` como input — confirmar explícitamente que el schema Zod no los incluye |
| `update_activity` | Igual: **no** se agregan al schema de input. `completedAt`/`postponementCount` se derivan solos en el backend cuando el agente cambia `status`/`dueDate` vía esta misma tool |

**Tools a eliminar / crear:** ninguna — no se justifica una tool dedicada solo para dos campos derivados.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` — agregar `completedAt` y `postponementCount` a "Campos comunes" con la aclaración explícita de que son **de solo lectura** (el agente nunca debe intentar enviarlos); opcionalmente una línea en "Reglas de comportamiento" indicando que reprogramar `dueDate` hacia adelante incrementa `postponementCount` solo, útil si el usuario pregunta "¿cuántas veces he movido esto?".

**Fase de MCP en este spec:** Fase 3 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend: entidad y lógica
- [ ] `activity.entity.ts`: agregar `completedAt` y `postponementCount`
- [ ] `update()`: capturar `previousDueDate` antes del `Object.assign`
- [ ] `update()`: setear `completedAt = now()` en la transición hacia `completed`
- [ ] `update()`: limpiar `completedAt = null` en la transición saliente de
      `completed`
- [ ] `update()`: incrementar `postponementCount` solo si había `dueDate` previo
      y el nuevo es estrictamente posterior
- [ ] `completeSubtaskTree()`: incluir `completedAt` en el `UPDATE` masivo
- [ ] `create()`: `completedAt = now()` si nace `completed`
- [ ] Verificar que la cascada de spec-024 mantiene su comportamiento
      (unidireccional, recursiva, arrastra `cancelled`)
- [ ] `npm run build` y `npm run lint` en `backend/`

### Fase 2 — Migración
- [ ] Crear
      `migrations/1787000000001-AddCompletedAtAndPostponementCountToActivities.ts`
- [ ] Ejecutar en local y verificar con `\d activities`

### Fase 3 — MCP: actualizar `todo-api`
- [ ] Revisar descripciones de tools de consulta para reflejar los campos nuevos
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md` (campos
      derivados, no escribibles)
- [ ] Actualizar `docs/mcps/README.md` si cambia el alcance declarado
- [ ] Verificar que el MCP responde correctamente a las herramientas declaradas

### Fase 4 — Frontend (contrato)
- [ ] `types/index.ts`: agregar ambos campos a `Activity`
- [ ] `npm run lint` y `npm run build` en `frontend/`

### Fase 5 — Pruebas
- [ ] `backend/test/e2e-028-completed-at-y-postponement-count.e2e-spec.ts` en rojo
- [ ] Casos unitarios en `backend/src/activities/activities.service.spec.ts`
- [ ] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`)

> **Sin archivo de pruebas manuales**: este spec no toca UI, así que —según
> `CLAUDE.md`— el artefacto de aceptación son las pruebas automáticas.

## Criterios de aceptación

**`completedAt`**

- Un `PATCH` que lleva la actividad de `pending` a `completed` devuelve
  `completedAt` con la fecha/hora del cambio.
- Un segundo `PATCH` sobre esa actividad ya `completed`, que no toca `status`,
  **conserva** el `completedAt` original.
- Un `PATCH` de `completed` a `pending` devuelve `completedAt: null`.
- Al completar una tarea padre, **todas** sus subtareas (a cualquier nivel)
  quedan `completed` **con `completedAt` seteado**.
- Al reabrir esa tarea padre, el padre queda con `completedAt: null` y las
  subtareas **siguen** `completed` con su `completedAt` intacto.
- `completedAt` enviado por el cliente en el body es ignorado.

**`postponementCount`**

- Actividad nueva → `postponementCount: 0`.
- Actividad **sin** `dueDate` a la que se le asigna una fecha → sigue en `0`.
- Actividad con `dueDate` que recibe una fecha **posterior** → `1`; otra fecha
  posterior → `2`.
- Actividad con `dueDate` que recibe una fecha **anterior** → no cambia.
- Actividad con `dueDate` que recibe **el mismo** `dueDate` → no cambia.
- Actividad con `dueDate` a la que se le pone `dueDate: null` → no cambia.
- Un `PATCH` que cambia `deferUntil`/`scheduledFor`/`priority` sin tocar
  `dueDate` → no cambia.
- `postponementCount` enviado por el cliente en el body es ignorado.
- **Ningún** comportamiento del sistema cambia por alcanzar 3 postergaciones.

## Pruebas asociadas

- **Manuales:** no aplica (spec sin UI).
- **Automáticas (backend):**
  `backend/test/e2e-028-completed-at-y-postponement-count.e2e-spec.ts` (un caso
  por criterio de aceptación, en rojo desde el inicio) y casos unitarios en
  `backend/src/activities/activities.service.spec.ts`, incluyendo un caso de
  regresión explícito de la cascada de spec-024.

## Decisiones ya resueltas (criterio de menor riesgo, ver justificación)

1. **Backfill de `completedAt`: no se backfillea.** Las actividades ya
   completadas quedan con `completedAt: null`. El único candidato disponible
   (`updatedAt`) es una aproximación que puede estar meses desfasada y
   contaminaría cualquier métrica futura de cierre — un dato ausente es más
   honesto que uno falso. Si en el futuro se prefiere una aproximación, sigue
   siendo posible correr `UPDATE activities SET "completedAt" = "updatedAt"
   WHERE status = 'completed'` como script separado, sin tocar este spec.
2. **Actividades creadas ya `completed`: se setea `completedAt` en `create()`.**
   Caso raro (importaciones, MCP) pero deja el dato coherente con el resto del
   modelo — una actividad completada nunca debería tener `completedAt: null`.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{fecha}}
