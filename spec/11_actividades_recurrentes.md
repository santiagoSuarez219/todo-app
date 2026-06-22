# Spec 11 — [DONE] Actividades Recurrentes

## Objetivo

Permitir que cualquier actividad (TASK, EVENT o REMINDER) sea marcada como recurrente, definiendo una regla de repetición (diaria, semanal, mensual) con días específicos y fecha de fin opcional. Un scheduler diario genera automáticamente las instancias correspondientes, manteniendo la relación entre el template y sus instancias hijo.

---

## Decisiones de Diseño

### 1. Modelo de datos de recurrencia

**Decision: columnas en la misma tabla `activities`**, no tabla separada ni RRULE string.

Justificación: las frecuencias requeridas (diaria, semanal, mensual) son un conjunto cerrado y pequeño. Columnas directas en `activities` evitan un JOIN en cada consulta de listado, simplifican el ORM (sin nueva entidad) y son suficientes para la complejidad actual del proyecto. RRULE (RFC 5545) es potente pero añade una dependencia de parsing y complejidad de UI innecesaria para este scope. Una tabla separada tendría sentido si se requirieran reglas complejas (BYSETPOS, EXDATE, múltiples frecuencias), lo cual está fuera de scope.

### 2. Relación template → instancias

**Decision: campo `templateId` (FK a `activities.id`) + campo `isTemplate: boolean`** en la misma tabla.

- El registro con `isTemplate = true` es el template padre. Contiene toda la configuración de recurrencia.
- Cada instancia generada tiene `templateId` apuntando al template padre e `isTemplate = false`.
- No se crea una entidad separada: se reutiliza la entidad `Activity` con auto-referencia, consistente con el patrón ya existente de `parent/subtasks`.

### 3. Motor de generación

`@nestjs/schedule` con un `RecurrenceSchedulerService` que corre a medianoche. Genera únicamente las instancias para el día siguiente (ventana de 24h), no todas las instancias futuras. Esto evita explosión de registros y permite editar el template sin afectar instancias ya generadas.

### 4. Alcance de tipos

Todos los tipos (TASK, EVENT, REMINDER) pueden ser recurrentes. Consideraciones por tipo:
- **TASK**: la instancia hereda `priority`, `energy`, `device`, `duration` del template; `status` siempre inicia en PENDING.
- **EVENT**: hereda `location`, `duration`; `actionDate` se calcula por la regla.
- **REMINDER**: hereda `description`; la instancia se crea con `scheduledForToday = true` automáticamente si la fecha generada es hoy.

### 5. Frecuencias

| Frecuencia | Identificador | Parámetros adicionales |
|---|---|---|
| Diaria | `daily` | ninguno |
| Semanal | `weekly` | `recurrenceDays` (array de 0-6, donde 0=domingo) |
| Quincenal | `biweekly` | `recurrenceDays` (igual que weekly) |
| Mensual | `monthly` | `recurrenceDayOfMonth` (1-31) |
| Anual | `yearly` | ninguno (usa el día/mes del `actionDate` del template) |

### 6. Fecha de fin

Campo `recurrenceEndDate: Date | null`. Si es null, la recurrencia es indefinida (el scheduler corre indefinidamente). El scheduler omite la generación de instancias si la fecha objetivo supera `recurrenceEndDate`.

### 7. UI

Sección "Repetición" en `ActivityForm` con: toggle de activación, selector de frecuencia, selector de días de la semana (solo visible si frecuencia = weekly o biweekly), campo de día del mes (solo si monthly), y datepicker opcional para fecha de fin. `ActivityCard` muestra un indicador visual (ícono de ciclo) cuando `isTemplate = true` o cuando `templateId` está presente.

---

## Tabla de Impacto Arquitectural

| Capa | Archivo | Cambio |
|---|---|---|
| Base de datos | nueva migración | Agregar columnas de recurrencia a `activities` |
| Entidad | `activity.entity.ts` | Nuevos campos y auto-relación `template/instances` |
| DTO | `create-activity.dto.ts` | Nuevos campos opcionales de recurrencia |
| DTO | `update-activity.dto.ts` | Heredar/replicar campos de recurrencia |
| Servicio | `activities.service.ts` | Lógica de creación de template, query de instancias |
| Scheduler | `recurrence-scheduler.service.ts` (nuevo) | Cron job de generación diaria |
| Módulo | `activities.module.ts` | Registrar scheduler y `@nestjs/schedule` |
| Módulo raíz | `app.module.ts` | Importar `ScheduleModule.forRoot()` |
| MCP | `mcp.service.ts` | Exponer tools de recurrencia a la IA |
| Tipos | `frontend/src/types/index.ts` | Extender interfaz `Activity`, agregar tipos de recurrencia |
| Servicio HTTP | `activities.service.ts` (frontend) | Funciones para crear/actualizar con recurrencia |
| Hooks | `useActivities.ts` | Hooks para templates e instancias |
| Formulario | `ActivityForm.tsx` | Sección "Repetición" con schema Zod extendido |
| Card | `ActivityCard.tsx` | Indicador visual de recurrencia |
| Vistas | `ActivityList`, `TodayView`, `WeekView`, `OverdueView` | Filtrado/visualización de instancias vs templates |

---

## Fase 1 — Base de datos: migración de columnas de recurrencia

**Objetivo:** Agregar al esquema de PostgreSQL todos los campos necesarios para describir una regla de recurrencia y la relación template/instancia.

**Pasos:**

1. Crear un nuevo archivo de migración TypeORM en `backend/src/migrations/` con nombre descriptivo (ej: `1782000000002-AddRecurrenceToActivities.ts`).
2. En el método `up` de la migración, agregar las siguientes columnas a la tabla `activities`:
   - `isTemplate` (boolean, default false, not null)
   - `templateId` (uuid, nullable, FK a `activities.id` con `ON DELETE SET NULL`)
   - `isRecurring` (boolean, default false, not null) — campo de lectura rápida para queries
   - `recurrenceFrequency` (varchar nullable): valores `daily | weekly | biweekly | monthly | yearly`
   - `recurrenceDays` (integer array, nullable): días de la semana para weekly/biweekly (0=domingo…6=sábado)
   - `recurrenceDayOfMonth` (integer nullable): día del mes para monthly (1-31)
   - `recurrenceEndDate` (timestamptz nullable): fecha hasta la cual generar instancias
   - `instanceDate` (date nullable): fecha específica de esta instancia (solo en registros con templateId)
3. Crear índice sobre `(templateId)` para queries de instancias por template.
4. Crear índice sobre `(isTemplate, isRecurring)` para el scheduler.
5. Implementar el método `down` que revierte todas las columnas e índices.
6. Verificar que la migración corre sin errores con `npm run migration:run`.

**Archivos a crear:**
- `backend/src/migrations/1782000000002-AddRecurrenceToActivities.ts`

---

## Fase 2 — Entidad: extender `Activity`

**Objetivo:** Reflejar las nuevas columnas en la entidad TypeORM y establecer la auto-relación template/instancias.

**Pasos:**

1. Abrir `backend/src/activities/entities/activity.entity.ts`.
2. Crear un enum `RecurrenceFrequency` en `backend/src/common/enums/recurrence-frequency.enum.ts` con los valores: `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `YEARLY`.
3. Agregar los decoradores `@Column` para cada nuevo campo: `isTemplate`, `templateId`, `isRecurring`, `recurrenceFrequency`, `recurrenceDays`, `recurrenceDayOfMonth`, `recurrenceEndDate`, `instanceDate`.
4. Agregar la relación `@ManyToOne` de instancia hacia template: `template: Activity | null` (FK `templateId`).
5. Agregar la relación `@OneToMany` inversa: `instances: Activity[]` (con `eager: false` para no afectar queries existentes).
6. Verificar que los tipos TypeScript de los campos nuevos son correctos (nullables explícitos con `| null`).

**Archivos a editar/crear:**
- `backend/src/common/enums/recurrence-frequency.enum.ts` (crear)
- `backend/src/activities/entities/activity.entity.ts`

---

## Fase 3 — DTOs y validación

**Objetivo:** Exponer los campos de recurrencia en la API de creación y actualización con validaciones estrictas.

**Pasos:**

1. Abrir `backend/src/activities/dto/create-activity.dto.ts`.
2. Agregar campos opcionales de recurrencia:
   - `isRecurring?: boolean` — activa la recurrencia
   - `recurrenceFrequency?: RecurrenceFrequency` — enum validado con `@IsEnum`
   - `recurrenceDays?: number[]` — validado con `@IsArray`, `@IsInt` en cada elemento, rango 0-6
   - `recurrenceDayOfMonth?: number` — `@IsInt`, `@Min(1)`, `@Max(31)`
   - `recurrenceEndDate?: string` — `@IsDateString`
3. Agregar validación cruzada: si `isRecurring = true`, entonces `recurrenceFrequency` es requerido. Usar `@ValidateIf`.
4. Agregar validación: si `recurrenceFrequency = weekly | biweekly`, `recurrenceDays` debe tener al menos un elemento.
5. Agregar validación: si `recurrenceFrequency = monthly`, `recurrenceDayOfMonth` es requerido.
6. Verificar que `isTemplate`, `templateId` e `instanceDate` NO se exponen en el DTO (se setean solo internamente en el servicio).
7. `UpdateActivityDto` hereda los cambios por extensión de `PartialType(CreateActivityDto)`.

**Archivos a editar:**
- `backend/src/activities/dto/create-activity.dto.ts`

---

## Fase 4 — Lógica de servicio: creación y consulta de templates e instancias

**Objetivo:** Implementar en `ActivitiesService` la lógica para crear un template, consultar sus instancias, actualizar recurrencias y cancelar instancias futuras.

**Pasos:**

1. Abrir `backend/src/activities/activities.service.ts`.
2. En el método `create`: si `isRecurring = true` en el DTO, setear `isTemplate = true` en la entidad antes de guardar. No generar instancias en este momento.
3. Crear método privado `buildInstanceFromTemplate(template: Activity, date: Date): Activity` que construye una instancia (sin guardar) copiando los campos heredables del template y asignando `templateId`, `instanceDate`, `isTemplate = false`, `status = PENDING`.
4. Crear método público `getInstancesByTemplate(templateId: string): Promise<Activity[]>` que retorna todas las instancias de un template dado, ordenadas por `instanceDate`.
5. Crear método público `generateInstanceForDate(template: Activity, date: Date): Promise<Activity | null>` — verifica idempotencia (no genera si ya existe instancia para esa fecha) y guarda. Este método será llamado por el scheduler.
6. En el método `update`: si se editan campos heredables de un template (name, description, priority, energy, device, duration), actualizar también las instancias futuras con `status = PENDING` e `instanceDate > today`. Si `isRecurring` se cambia a `false`, setear `isTemplate = false` pero no borrar instancias existentes.
7. Crear método público `cancelFutureInstances(templateId: string): Promise<void>` que setea `status = CANCELLED` en todas las instancias con `templateId` dado, `status = PENDING` e `instanceDate > today`.
8. Actualizar el método `findOverdue` para excluir registros con `isTemplate = true` (un template no es una actividad vencida).
9. Actualizar `baseQuery` o `findAll` para aceptar filtro opcional `templateId`.

**Archivos a editar:**
- `backend/src/activities/activities.service.ts`

---

## Fase 5 — Controller: nuevos endpoints de recurrencia

**Objetivo:** Exponer endpoints REST para consultar instancias de un template y cancelar instancias futuras.

**Pasos:**

1. Abrir `backend/src/activities/activities.controller.ts`.
2. Agregar endpoint `GET /activities/:id/instances` que retorna todas las instancias de un template. Delega a `getInstancesByTemplate`.
3. Agregar endpoint `DELETE /activities/:id/future-instances` que cancela instancias futuras de un template. Delega a `cancelFutureInstances`.
4. Verificar que los endpoints existentes (`POST /activities`, `PATCH /activities/:id`) reciben correctamente los nuevos campos del DTO sin cambios en su firma HTTP.

**Archivos a editar:**
- `backend/src/activities/activities.controller.ts`

---

## Fase 6 — Scheduler: generación diaria de instancias

**Objetivo:** Crear un servicio con cron job que, cada medianoche, genera las instancias del día siguiente para todos los templates activos.

**Pasos:**

1. Instalar `@nestjs/schedule` y `@types/cron` en el backend (`package.json`).
2. Crear el archivo `backend/src/activities/recurrence-scheduler.service.ts`.
3. Implementar la clase `RecurrenceSchedulerService` decorada con `@Injectable`.
4. Definir el método `generateNextDayInstances` decorado con `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`.
5. Dentro del método:
   a. Calcular la fecha objetivo: `tomorrow = today + 1 día`.
   b. Consultar todos los `Activity` donde `isTemplate = true`, `isRecurring = true`, y (`recurrenceEndDate IS NULL` OR `recurrenceEndDate >= tomorrow`).
   c. Para cada template, evaluar si la fecha objetivo corresponde según la frecuencia:
      - `daily`: siempre corresponde.
      - `weekly` / `biweekly`: verificar si el día de la semana de `tomorrow` está en `recurrenceDays`. Para biweekly, verificar adicionalmente si es la semana correcta calculando la diferencia de semanas desde `actionDate` del template.
      - `monthly`: verificar si `tomorrow.getDate() === recurrenceDayOfMonth`.
      - `yearly`: verificar si `tomorrow` coincide con el mes y día del `actionDate` del template.
   d. Si corresponde, llamar a `generateInstanceForDate(template, tomorrow)` (ya maneja idempotencia).
6. Agregar logging básico con el `Logger` de NestJS: cuántos templates procesados y cuántas instancias creadas.
7. Registrar el servicio en `activities.module.ts` como provider.
8. Importar `ScheduleModule.forRoot()` en `app.module.ts`.

**Archivos a crear/editar:**
- `backend/src/activities/recurrence-scheduler.service.ts` (crear)
- `backend/src/activities/activities.module.ts`
- `backend/src/app.module.ts`

---

## Fase 7 — MCP: exponer tools de recurrencia a la IA

**Objetivo:** Que el MCP server pueda crear actividades recurrentes, consultar instancias y cancelar recurrencias futuras.

**Pasos:**

1. Abrir `backend/src/mcp/mcp.service.ts`.
2. Agregar tool `create_recurring_activity` con parámetros: `name`, `type`, `recurrenceFrequency`, `recurrenceDays?`, `recurrenceDayOfMonth?`, `recurrenceEndDate?`, y los campos de actividad estándar. La tool setea `isRecurring: true` antes de delegar a `ActivitiesService.create`.
3. Agregar tool `get_activity_instances` con parámetro `templateId`. Retorna las instancias de un template.
4. Agregar tool `cancel_future_instances` con parámetro `templateId`. Cancela instancias futuras.
5. Actualizar la tool existente `update_activity` para aceptar los campos de recurrencia opcionales (`recurrenceFrequency`, `recurrenceDays`, `recurrenceDayOfMonth`, `recurrenceEndDate`).

**Archivos a editar:**
- `backend/src/mcp/mcp.service.ts`

---

## Fase 8 — Tipos frontend

**Objetivo:** Extender las interfaces TypeScript del frontend para reflejar el modelo de recurrencia.

**Pasos:**

1. Abrir `frontend/src/types/index.ts`.
2. Crear el tipo `RecurrenceFrequency` con los mismos valores que el backend: `'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'`.
3. Extender la interfaz `Activity` con los campos nuevos: `isTemplate`, `templateId`, `isRecurring`, `recurrenceFrequency`, `recurrenceDays`, `recurrenceDayOfMonth`, `recurrenceEndDate`, `instanceDate` (todos opcionales o nullable según corresponda).
4. Crear interfaz `RecurrenceConfig` que agrupa los campos de recurrencia (útil para tipar el formulario y props de componentes).
5. Extender `CreateActivityDto` con los campos de recurrencia opcionales.
6. Crear tipo auxiliar `WeekDay` (0 | 1 | 2 | 3 | 4 | 5 | 6) para el selector de días.

**Archivos a editar:**
- `frontend/src/types/index.ts`

---

## Fase 9 — Servicio HTTP y hooks frontend

**Objetivo:** Agregar las llamadas HTTP para los nuevos endpoints y los React Query hooks correspondientes.

**Pasos:**

1. Abrir `frontend/src/services/activities.service.ts`.
2. Agregar función `getActivityInstances(templateId: string): Promise<Activity[]>` que llama a `GET /activities/:id/instances`.
3. Agregar función `cancelFutureInstances(templateId: string): Promise<void>` que llama a `DELETE /activities/:id/future-instances`.
4. Abrir `frontend/src/hooks/useActivities.ts`.
5. Agregar hook `useActivityInstances(templateId: string)` usando `useQuery` con key `['activities', templateId, 'instances']`.
6. Agregar hook `useCancelFutureInstances()` usando `useMutation` con invalidación de `['activities']` en `onSuccess`.

**Archivos a editar:**
- `frontend/src/services/activities.service.ts`
- `frontend/src/hooks/useActivities.ts`

---

## Fase 10 — Formulario: sección "Repetición"

**Objetivo:** Extender `ActivityForm` con una sección de configuración de recurrencia, con visibilidad condicional por frecuencia.

**Pasos:**

1. Abrir `frontend/src/components/ActivityForm.tsx`.
2. Extender el schema Zod con los campos de recurrencia:
   - `isRecurring: z.boolean().default(false)`
   - `recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional()`
   - `recurrenceDays: z.array(z.number().min(0).max(6)).optional()`
   - `recurrenceDayOfMonth: z.number().min(1).max(31).optional()`
   - `recurrenceEndDate: z.string().optional()`
   - Refinamiento: si `isRecurring = true`, `recurrenceFrequency` es requerido.
   - Refinamiento: si `recurrenceFrequency = weekly | biweekly`, `recurrenceDays` debe tener mínimo 1 elemento.
   - Refinamiento: si `recurrenceFrequency = monthly`, `recurrenceDayOfMonth` es requerido.
3. Agregar la sección "Repetición" al JSX, posicionada antes de los botones de acción:
   a. Toggle "¿Actividad recurrente?" controlado por `isRecurring`.
   b. Selector de frecuencia (dropdown): visible solo si `isRecurring = true`.
   c. Selector de días de la semana (checkboxes: L/M/X/J/V/S/D): visible solo si frecuencia es `weekly` o `biweekly`.
   d. Input numérico "Día del mes": visible solo si frecuencia es `monthly`.
   e. Datepicker "Fecha de fin (opcional)": visible si `isRecurring = true`.
4. Usar `watch` de React Hook Form para controlar la visibilidad condicional.
5. En modo edición, cargar correctamente los valores de recurrencia existentes en `defaultValues`.
6. Si se edita un template con instancias existentes, mostrar un mensaje de advertencia informando que los cambios afectarán instancias futuras pendientes.

**Archivos a editar:**
- `frontend/src/components/ActivityForm.tsx`

---

## Fase 11 — ActivityCard: indicador de recurrencia

**Objetivo:** Mostrar en `ActivityCard` indicadores visuales que distingan templates de instancias recurrentes, y exponer la acción de cancelar instancias futuras.

**Pasos:**

1. Abrir `frontend/src/components/ActivityCard.tsx`.
2. Agregar condición para `activity.isTemplate === true`: mostrar un ícono de ciclo/repetición junto al nombre de la actividad, con tooltip que muestre la frecuencia en texto legible (ej: "Se repite semanalmente").
3. Agregar condición para `activity.templateId !== null`: mostrar un badge o ícono secundario sutil que indica que es una instancia generada automáticamente.
4. En el menú de acciones del card, agregar opción "Cancelar instancias futuras" visible únicamente cuando `activity.isTemplate = true`. Dispara `useCancelFutureInstances` con confirmación previa.
5. En las acciones de editar y eliminar sobre un template, agregar un mensaje de advertencia sobre el impacto en instancias futuras.

**Archivos a editar:**
- `frontend/src/components/ActivityCard.tsx`

---

## Fase 12 — Vistas: ajustes de filtrado y visualización

**Objetivo:** Actualizar las vistas de listado para manejar correctamente templates e instancias, especialmente en `OverdueView`.

**Pasos:**

1. `frontend/src/pages/ActivityList.tsx`: agregar filtro visual opcional "Solo recurrentes" que filtra por `isRecurring = true`. Considerar agrupación opcional por template (acordeón mostrando instancias bajo su template padre).

2. `frontend/src/pages/OverdueView.tsx` + `backend/src/activities/activities.service.ts` — método `findOverdue`: excluir registros con `isTemplate = true` (un template no es una actividad vencida). Las instancias vencidas sí deben aparecer.

3. `frontend/src/pages/TodayView.tsx` y `WeekView.tsx`: verificar que las instancias generadas por el scheduler aparecen en las vistas correctas. Si el filtro de hoy se basa en `actionDate` o `scheduledForToday`, el scheduler debe poblar esos campos en las instancias al crearlas. Ajustar si es necesario.

4. Si `ProjectDetail` lista actividades del proyecto, verificar que los templates aparecen una sola vez sin duplicarse con sus instancias.

**Archivos a editar/verificar:**
- `frontend/src/pages/ActivityList.tsx`
- `frontend/src/pages/OverdueView.tsx`
- `frontend/src/pages/TodayView.tsx` (verificar, posiblemente sin cambios)
- `frontend/src/pages/WeekView.tsx` (verificar, posiblemente sin cambios)
- `backend/src/activities/activities.service.ts` (ajuste en `findOverdue`)

---

## Orden de Implementación y Dependencias

```
Fase 1: Migración BD
    │
    ▼
Fase 2: Entidad Activity
    │
    ├──────────────────────┐
    ▼                      ▼
Fase 3: DTOs          Fase 6: Scheduler
    │                      │
    ▼                      │ (depende de Fase 4)
Fase 4: Servicio ◄─────────┘
    │
    ├──────────────┐
    ▼              ▼
Fase 5:       Fase 7: MCP
Controller    (independiente del frontend)
    │
    ▼
Fase 8: Tipos Frontend
    │
    ▼
Fase 9: Servicio HTTP + Hooks
    │
    ├──────────────┬─────────────┐
    ▼              ▼             ▼
Fase 10:      Fase 11:      Fase 12:
ActivityForm  ActivityCard   Vistas
```

| Fase | Depende de | Razón |
|---|---|---|
| Fase 2 | Fase 1 | La entidad debe reflejar columnas existentes en BD |
| Fase 3 | Fase 2 | Los DTOs referencian el enum de recurrencia |
| Fase 4 | Fase 3 | El servicio recibe DTOs validados |
| Fase 5 | Fase 4 | El controller delega al servicio |
| Fase 6 | Fase 4 | El scheduler usa métodos internos del servicio |
| Fase 7 | Fase 4, 5 | MCP delega a servicio y controller |
| Fase 8 | Fase 2 | Los tipos frontend espejo del modelo backend |
| Fase 9 | Fase 5, 8 | Servicio HTTP llama endpoints y usa tipos de Fase 8 |
| Fase 10 | Fase 9, 8 | Formulario usa hooks y tipos |
| Fase 11 | Fase 9, 8 | Card usa hook de cancelación y tipos |
| Fase 12 | Fase 10, 11 | Vistas integran todos los componentes anteriores |

**Bloqueantes de merge:** Fases 1–6 deben completarse y verificarse en backend antes de comenzar Fase 8 en adelante. Fases 7 y 8–12 pueden desarrollarse en paralelo una vez desbloqueadas sus dependencias respectivas.
