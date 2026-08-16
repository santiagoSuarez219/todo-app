# spec-027 — [DONE] Limpieza del modelo de Activity: eliminar `notionUrl`, `isRecurring` y `type`

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Este spec es el **primero**: se limpia el
> modelo antes de agregarle nada. Orden del paquete:
> **027 (limpieza)** → 028 (`completedAt` + `postponementCount`) →
> 029 (`horizon` en `Project`) → 030 (`deferUntil`) → 031 (`scheduledFor`) →
> 032 (`waiting`).

## Contexto

El modelo de `Activity` acumula tres campos que ya no sostienen ninguna decisión
del usuario y que encarecen cada cambio futuro (DTO, servicio, MCP, formulario,
system prompt):

- **`notionUrl`** — nació de un flujo de trabajo con Notion que el usuario ya no
  usa. Sigue vivo en la UI (input en el formulario, chip en la card) pero sin uso
  real. Si algún día vuelve a hacer falta un enlace externo, se agregará un campo
  genérico `referenceUrl`; **este spec no lo agrega**, solo deja constancia de la
  intención.
- **`isRecurring`** — es estado derivado guardado: siempre se escribe con el
  mismo valor que `isTemplate`, y la condición real de "esto genera instancias"
  la decide `recurrenceFrequency != null` (`shouldGenerateForDate()` corta ahí).
  Un estado derivado que se persiste es un estado que en algún momento miente.
- **`type`** (`task | reminder`) — se introdujo pensando en notificaciones que
  **nunca se implementaron**. Verificado en el código: no existe ninguna lógica
  de notificación (ni push, ni email, ni cron de recordatorio). Hoy `type` solo
  produce dos efectos laterales implícitos (truncar `dueDate` a medianoche en
  tareas, prohibir subtareas en recordatorios) y un endpoint de filtrado que el
  frontend **no consume**.

Quitarlos ahora abarata los cinco specs siguientes del paquete, que agregan
campos nuevos sobre esta misma entidad.

## Alcance

### Incluye

Eliminación completa, de punta a punta, de `notionUrl`, `isRecurring` y `type`
en `Activity`: base de datos, entidad, DTOs, servicio, controlador, tipos del
frontend, formulario, card, servicio HTTP del frontend, herramientas del MCP y
system prompt.

### Decisiones tomadas con el usuario

- **`type` se elimina, no se reemplaza.** Sin `type` no hay criterio para
  distinguir tarea de recordatorio; toda actividad es una actividad con
  `dueDate` opcional.
- **`sanitizeByType()` desaparece por completo**, con sus dos consecuencias
  explícitas:
  1. **Ya no se trunca `dueDate` a medianoche.** Se persiste la fecha/hora que
     envíe el cliente. En la práctica el formulario envía fecha sin hora, así
     que sigue llegando a medianoche local; y todas las consultas por día
     (`findToday`, `findTomorrow`, `findThisWeek`) usan rangos `BETWEEN
     00:00–23:59`, por lo que cualquier hora del día sigue cayendo en su día.
  2. **Cualquier actividad puede tener subtareas.** Se elimina la regla que
     descartaba `parentId` cuando el tipo era `reminder`.
- **`isRecurring` desaparece del modelo y del contrato.** La señal de "esto es
  una plantilla recurrente" pasa a ser `recurrenceFrequency != null`:
  - `create()` y `update()` derivan `isTemplate = recurrenceFrequency != null`.
  - Enviar `recurrenceFrequency: null` en un `update()` deja de ser plantilla
    (`isTemplate = false`). Las instancias ya generadas **no se tocan**; para
    eliminarlas sigue existiendo `DELETE /activities/:id/future-instances`.
  - `findActiveTemplates()` pasa a filtrar `isTemplate = true AND
    recurrenceFrequency IS NOT NULL`.
- **La UI conserva su checkbox "Es recurrente"**, pero como **estado local del
  formulario**, no como campo del DTO: al desmarcarlo se envía
  `recurrenceFrequency: null`.
- **`getActivitiesByType()` del frontend se elimina** — verificado: no tiene
  ningún consumidor (función muerta, sin ruta que la use).

### Lo que NO incluye

- **No agrega `referenceUrl`** ni ningún sustituto de `notionUrl`.
- **No agrega `size`** (estimación de esfuerzo). Fuera de alcance de los seis
  specs del paquete: el usuario quiere que `energy` acumule datos reales antes
  de introducir una segunda dimensión de estimación. Ver nota en cada spec.
- No toca `scheduledForToday` (spec-031), ni el enum `ActivityStatus`
  (spec-032), ni agrega campos nuevos de ningún tipo.
- No modifica `recurrence-scheduler.service.ts` en su lógica de calendario
  (frecuencias, días, fin de recurrencia): solo lo que dependa de los campos
  eliminados.
- No migra datos de `notionUrl` a ningún otro lugar: **la columna se borra y su
  contenido se pierde**. Si el usuario quiere conservar esas URLs, debe
  exportarlas antes de correr la migración (ver "Decisiones a confirmar").

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `common/enums/activity-type.enum.ts` | **Se elimina** el archivo |
| `activities/entities/activity.entity.ts` | Quitar columnas `type`, `notionUrl`, `isRecurring` y el import de `ActivityType` |
| `activities/dto/create-activity.dto.ts` | Quitar props `type`, `notionUrl`, `isRecurring`; quitar el `@ValidateIf((o) => o.isRecurring === true)` de `recurrenceFrequency`; limpiar imports huérfanos (`IsUrl`, `ActivityType`, posiblemente `IsBoolean` si `scheduledForToday` queda como único uso) |
| `activities/dto/update-activity.dto.ts` | Sin cambios (`PartialType`), se ajusta solo |
| `activities/activities.service.ts` | Eliminar `sanitizeByType()` (líneas ~60-76) y sus 2 llamadas (`create()` ~184, `update()` ~235); quitar `dto.type ?? activity.type`; reemplazar los bloques `isRecurring/isTemplate` de `create()` y `update()` por `isTemplate = recurrenceFrequency != null`; eliminar `findByType()` (~539-544); ajustar `findActiveTemplates()` (~376-381); ajustar `buildInstanceFromTemplate()` (~80-101): quitar copia de `type`, quitar la rama que daba `dueDate` a las 9am a los recordatorios y quitar `isRecurring: false` |
| `activities/activities.controller.ts` | Eliminar `GET /activities/type/:type` (~111-119) y los imports que queden huérfanos |
| `activities/activities.service.spec.ts` | Actualizar los casos unitarios que construyan actividades con `type`/`isRecurring` |
| `migrations/1787000000000-CleanupActivityModel.ts` | **Nueva migración** (ver abajo) |

### Base de datos

**Migración `1787000000000-CleanupActivityModel.ts`** — sigue el patrón de
`1782000000003-SimplifyActivityModel.ts` (precedente directo de eliminación de
columnas):

- `up()`:
  - `ALTER TABLE "activities" DROP COLUMN "notionUrl"`
  - `ALTER TABLE "activities" DROP COLUMN "isRecurring"`
  - `ALTER TABLE "activities" DROP COLUMN "type"`
  - `DROP TYPE "public"."activities_type_enum"`
- `down()`: recrea el tipo enum y las tres columnas con sus defaults originales
  (`type` default `'task'`, `isRecurring` default `false`, `notionUrl` nullable).
  **El contenido de `notionUrl` y el valor real de `type` por fila no se
  recuperan**: el `down()` restituye estructura, no datos.
- Confirmar el nombre real del tipo enum en la base antes de escribir el
  `DROP TYPE` (`\dT` o consulta a `pg_type`); el nombre esperado por convención
  de TypeORM es `activities_type_enum`.

> `synchronize` sigue en `false` (dev y producción). Este cambio de esquema solo
> se aplica por migración explícita.

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Eliminar el const/type `ActivityType` (líneas ~20-24); quitar `type`, `notionUrl`, `isRecurring` de `Activity` (~80-86) y de `CreateActivityDto` (~117-120); revisar la interfaz de recurrencia (~52) que declara `isRecurring` |
| `components/ActivityForm.tsx` | Quitar el selector de tipo, la ramificación `isReminder` (`useWatch`) y sus reglas Zod; quitar el input de `notionUrl` y su validación de URL; convertir el checkbox de recurrencia en estado local que envía/limpia `recurrenceFrequency` |
| `components/ActivityCard.tsx` | Quitar el chip `<a href={notionUrl}>`; quitar `isTask = activity.type === 'task'` y mostrar el contador de subtareas siempre que existan subtareas |
| `services/activities.service.ts` | Eliminar `getActivitiesByType()` (función muerta) |
| Consumidores restantes | Ejecutar un `grep` de `notionUrl`, `isRecurring`, `ActivityType` y `\.type` sobre `frontend/src` antes de cerrar la fase, para no dejar referencias colgadas |

> No hay cambios de sistema de diseño. La única pérdida visual es el chip de
> Notion en la card y dos campos del formulario. Aun así, leer
> `frontend/DESIGN.md` antes de tocar `ActivityForm`/`ActivityCard`.

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

Cambios requeridos (el **cómo** lo detalla `@mcp-builder`):

- `create_activity` (~línea 245): quitar los parámetros `type` y `notionUrl`.
- `update_activity` (~285-297): quitar `type`, `notionUrl`, `isRecurring`.
- `create_recurring_activity` (~441, 543, 573): quitar `type` y `notionUrl`;
  su forzado interno `isRecurring: true` deja de existir (queda implícito por
  `recurrenceFrequency`).
- **`get_activities_by_type` se elimina** como herramienta.
- `docs/mcps/asistente-personal.system-prompt.md`: documenta `type` de forma
  extensa (líneas 32, 40-41, 43-44, 50, 135, 142, 192, 219, 223) — requiere
  reescritura de esas secciones.
- `docs/mcps/README.md`: actualizar el inventario si cambia el conteo/alcance
  de tools.

## Evaluación MCP

**¿Aplica MCP?** **Sí.** Elimina parámetros (`type`, `isRecurring`,
`notionUrl`) hoy expuestos en los schemas Zod de varias tools, y elimina por
completo una tool dedicada (`get_activities_by_type`). Debe ir en el mismo
spec que borra los campos del backend — de lo contrario las tools quedarían
con parámetros fantasma que rompen en runtime contra el DTO real.

- **MCP existente a modificar:** `todo-api` (no se crea uno nuevo).

**Tools a modificar:**

| Tool | Cambio en su schema Zod |
|---|---|
| `create_activity` | Elimina `type: z.enum(['reminder','task']).optional()` y `notionUrl: z.string().url().optional()`. Ajustar la descripción de la tool y la de `dueDate` (hoy bifurcada por tipo) a una fecha límite única, sin distinción |
| `update_activity` | Elimina `type`, `notionUrl` (`.nullable()`) e `isRecurring: z.boolean().optional()` |
| `create_recurring_activity` | Elimina `type` y `notionUrl` de su schema |
| `get_today_activities` | Sin cambio de schema (su descripción no depende de `type`) |

**Tools a eliminar:** `get_activities_by_type` — completa (registro + handler), queda huérfana sin el campo que filtraba.

**Tools a crear:** ninguna.

**⚠️ Riesgos de dependencia de un agente activo (confirmar antes de implementar):**
- `get_activities_by_type` — si algún agente usa este filtro para segmentar tareas de recordatorios, pierde esa capacidad sin sustituto directo.
- `type` en `create_activity`/`update_activity`/`create_recurring_activity` — el system prompt actual construye el flujo de creación y la tabla de semántica de `dueDate` alrededor de esta distinción; un agente que la siga literalmente fallará (`forbidNonWhitelisted: true` rechaza el parámetro).
- `isRecurring` en `update_activity` — hoy es la única forma documentada de activar/desactivar recurrencia vía update; confirmar que la recurrencia sigue gestionable solo vía `create_recurring_activity`/`cancel_future_instances`, o si falta cubrir ese caso.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` (el de finanzas no se toca) — reescribir el bloque de `type`/tabla de semántica de `dueDate` (líneas ~31-45), quitar `notionUrl` de "Campos comunes" (~47-50), quitar la fila de `get_activities_by_type` de la tabla de tools (~142), simplificar el "Flujo de creación de actividades" (quitar el paso de tipo, ~177-202), reescribir el ejemplo de "Recuérdame X mañana" (~219) sin mención a `type`, quitar "tipo" del formato de presentación de listas (~226), y aclarar cómo se gestiona la recurrencia tras perder `isRecurring` de `update_activity` (~52-53).

**Fase de MCP en este spec:** Fase 4 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend: modelo, DTO y servicio
- [x] Eliminar `backend/src/common/enums/activity-type.enum.ts`
- [x] `activity.entity.ts`: quitar `type`, `notionUrl`, `isRecurring` e imports
- [x] `create-activity.dto.ts`: quitar las tres props, el `@ValidateIf` de
      `recurrenceFrequency` y los imports huérfanos
- [x] `activities.service.ts`: eliminar `sanitizeByType()` y sus llamadas
- [x] `activities.service.ts`: derivar `isTemplate = recurrenceFrequency != null`
      en `create()` y `update()`
- [x] `activities.service.ts`: ajustar `findActiveTemplates()` y
      `buildInstanceFromTemplate()`
- [x] `activities.service.ts`: eliminar `findByType()`
- [x] `activities.controller.ts`: eliminar `GET /activities/type/:type`
- [x] `npm run build` y `npm run lint` en `backend/` sin errores — build
      queda en rojo solo por `mcp.service.ts`, pendiente de la Fase 4; el
      resto del código de esta fase compila limpio

### Fase 2 — Migración
- [x] Confirmar en base el nombre real del tipo enum de `type`
      (`activities_type_enum`, confirmado vía `\dT+`)
- [x] Crear `migrations/1787000000000-CleanupActivityModel.ts` con los tres
      `DROP COLUMN` y el `DROP TYPE`
- [x] Escribir el `down()` que restituye estructura (documentando la pérdida de
      datos de `notionUrl`)
- [x] Ejecutar la migración **solo en local**: `npm run migration:run`
- [x] Verificar con `\d activities` que las tres columnas ya no existen

### Fase 3 — Frontend
- [x] Leer `frontend/DESIGN.md` antes de tocar componentes
- [x] `types/index.ts`: eliminar `ActivityType` y los tres campos de `Activity`
      y `CreateActivityDto` (además: `RecurrenceConfig`, tipo muerto sin
      consumidores que también declaraba `isRecurring`)
- [x] `ActivityForm.tsx`: quitar selector de tipo, `isReminder`, input de
      `notionUrl`; recurrencia como estado local del formulario (`isRecurring`
      del schema Zod nunca viaja al DTO — se traduce a `recurrenceFrequency`
      o a `null`)
- [x] `ActivityCard.tsx`: quitar chip de Notion y la condición `isTask`; el
      contador de subtareas y el botón "Agregar subtarea" ahora aplican a
      cualquier actividad con/sin subtareas
- [x] `services/activities.service.ts`: eliminar `getActivitiesByType()`
- [x] `grep` de residuos (`notionUrl`, `isRecurring`, `ActivityType`) en
      `frontend/src` — sin residuos (las 4 ocurrencias de `isRecurring`
      restantes son el estado local intencional de `ActivityForm.tsx`)
- [x] `npm run lint` y `npm run build` en `frontend/` sin errores — build
      limpio; lint scoped a los 4 archivos tocados sin hallazgos (los 4
      errores que reporta `npm run lint` sobre todo el árbol son deuda
      preexistente en `Login.tsx`, `ExpensesView.tsx` y `auth.service.ts`,
      fuera de alcance de este spec)

### Fase 4 — MCP: actualizar `todo-api`
- [x] Quitar `type`/`notionUrl`/`isRecurring` de `create_activity`,
      `update_activity` y `create_recurring_activity`
- [x] Eliminar la herramienta `get_activities_by_type`
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md`
- [x] Actualizar `docs/mcps/README.md` — sin cambios necesarios: no enumera
      tools individuales ni conteos, nada quedó desactualizado
- [x] Verificar que el MCP responde correctamente a las herramientas
      declaradas — backend levantado en local, `tools/list` confirma 69
      tools, `get_activities_by_type` ausente, y `type`/`notionUrl`/
      `isRecurring` fuera de los schemas de `create_activity`/`update_activity`

### Fase 5 — Pruebas
- [x] `docs/testing/test-027-limpieza-modelo-actividad.md` con casos `TC-027-xx`
      y `TC-MCP-027-xx` (redactado junto con el spec; pendiente de ejecución
      manual por el usuario)
- [x] `backend/test/e2e-027-limpieza-modelo-actividad.e2e-spec.ts` — 12/12 en
      verde. `AC-027-01` se corrigió durante esta fase: el archivo seguía
      esperando `201`/descarte silencioso a pesar de que el criterio de
      aceptación del spec ya documentaba el `400` real (`forbidNonWhitelisted`);
      se sincronizó el test con el criterio ya corregido, sin ampliar scope
- [x] Actualizar `backend/src/activities/activities.service.spec.ts` — 9/9
      casos `(spec-027)` en verde. `findActiveTemplates()` se reescribió de
      `createQueryBuilder` a `find({ where: { isTemplate: true,
      recurrenceFrequency: Not(IsNull()) } })` (más simple y ya devuelve el
      relations `project`, mismo filtrado); `create()`/`update()` pasaron de
      spread (`...rest`) a whitelist explícito campo por campo, así un
      llamador que evite el `ValidationPipe` HTTP (llamada directa al
      servicio, MCP) no puede colar un campo eliminado como `type`
- [x] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`) — ver
      resumen abajo; sin regresiones fuera de alcance (specs 028-032 siguen
      en rojo como se espera, aún no implementados)

## Criterios de aceptación

- `POST /activities` con `type`, `notionUrl` o `isRecurring` en el body
  responde **400** — `main.ts` fija `forbidNonWhitelisted: true` junto con
  `whitelist: true`, así que una propiedad no declarada en el DTO **rechaza
  toda la petición**, no se descarta en silencio. (Corregido tras la ronda de
  pruebas: el borrador inicial del spec asumía descarte silencioso; ver
  `backend/test/e2e-027-*.e2e-spec.ts`, que ya codifica el 400 real).
- La respuesta de `GET /activities/:id` no contiene `type`, `notionUrl` ni
  `isRecurring`.
- `GET /activities/type/:type` responde **404** (la ruta ya no existe).
- Crear una actividad con `recurrenceFrequency` la marca como plantilla
  (`isTemplate: true`) sin enviar `isRecurring`.
- Un `PATCH` con `recurrenceFrequency: null` deja `isTemplate: false` y **no
  borra** las instancias ya generadas.
- Una actividad **sin** `recurrenceFrequency` que reciba `recurrenceDays` no se
  convierte en plantilla.
- Es posible asignar `parentId` a **cualquier** actividad (ya no hay tipo que lo
  prohíba).
- `dueDate` se persiste con la hora enviada por el cliente y la actividad sigue
  apareciendo en `GET /activities/today` si esa fecha es hoy, sea cual sea la hora.
- El formulario del frontend ya no muestra selector de tipo ni campo de Notion, y
  guarda correctamente sin ellos.
- La card muestra el contador de subtareas para cualquier actividad con subtareas.
- El agente puede invocar `create_activity` sin `type` y obtener la actividad
  creada; invocar `get_activities_by_type` devuelve error de herramienta
  inexistente.

## Pruebas asociadas

> Estos archivos se crean junto con el spec.

- **Manuales:** `docs/testing/test-027-limpieza-modelo-actividad.md` — casos
  `TC-027-xx` (formulario sin tipo/Notion, card sin chip, subtareas en cualquier
  actividad, recurrencia sigue funcionando) y `TC-MCP-027-xx`.
- **Automáticas (backend):**
  `backend/test/e2e-027-limpieza-modelo-actividad.e2e-spec.ts` +
  actualización de `backend/src/activities/activities.service.spec.ts`.

## Decisiones ya resueltas con el usuario

1. **Pérdida de datos de `notionUrl`: se descarta sin exportar.** El usuario
   confirmó que el campo no tiene uso real; la migración borra la columna sin
   respaldo previo.
2. **Instancias recurrentes de plantillas que hoy son `reminder`: se acepta la
   regresión (opción A).** Al eliminar `type`, todas las instancias recurrentes
   pasan a `dueDate: null` y dejan de aparecer en la vista Hoy — solo se ven en
   el Cronograma (vía `instanceDate`), como ya les pasa hoy a las instancias de
   tipo `task`. **No se amplía el alcance de este spec** para compensarlo;
   queda como candidato natural para `deferUntil`/`scheduledFor` (specs
   030/031) o un spec futuro si hace falta.
3. **Nombre real del tipo enum** de `type` en Postgres: verificar en base
   (`\dT` o `pg_type`) antes de escribir el `DROP TYPE` — paso técnico de la
   Fase 2, no requiere decisión del usuario (se espera `activities_type_enum`
   por convención de TypeORM).

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-16
