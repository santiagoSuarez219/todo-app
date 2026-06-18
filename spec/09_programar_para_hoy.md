# Spec 09 — Programar para Hoy

## Objetivo

Agregar a cada actividad un control tipo checkbox/botón que permita al usuario marcarla como "programada para hoy". Las actividades marcadas aparecerán en el panel "Hoy" y permanecerán allí hasta que se completen o se desmarquen manualmente.

## Decisiones de diseño

- Se agrega un **campo booleano `scheduledForToday`** en la base de datos — no se reutiliza `actionDate`.
- El flag **no se limpia automáticamente** al cambiar de día: la actividad permanece en "Hoy" hasta que el usuario la complete o desmarque explícitamente.
- El panel "Hoy" muestra ambas fuentes: actividades cuya fecha natural es hoy (por `actionDate`/`dueDate`) y actividades con `scheduledForToday = true`.

---

## Resumen del Impacto Arquitectural

| Capa | Archivo | Cambio |
|---|---|---|
| **Base de datos** | nueva migración | columna `scheduled_for_today boolean NOT NULL DEFAULT false` en tabla `activities` |
| **Entidad** | `activity.entity.ts` | campo `scheduledForToday: boolean` con `@Column` |
| **DTO backend** | `create-activity.dto.ts` | campo `scheduledForToday?: boolean` con `@IsBoolean @IsOptional` |
| **Servicio backend** | `activities.service.ts` | `findToday` ampliado con cláusula OR para `scheduledForToday = true AND status != completed` |
| **MCP** | `mcp.service.ts` | campo `scheduledForToday` en schemas de `create_activity` y `update_activity` |
| **Tipos frontend** | `src/types/index.ts` | `scheduledForToday: boolean` en `Activity`; `scheduledForToday?: boolean` en `CreateActivityDto` |
| **Componente** | `src/components/ActivityCard.tsx` | botón/toggle "Programar para hoy" que dispara `useUpdateActivity` |
| **Vista** | `src/pages/TodayView.tsx` | distinción visual entre actividades por fecha y por programación manual |

---

## Fase 1 — Base de datos y entidad

**Objetivo:** Agregar la columna al esquema de PostgreSQL y reflejarla en TypeORM, sin cambiar comportamiento existente. El `DEFAULT false` garantiza que todas las actividades existentes se comporten igual.

**Pasos:**

1. Generar una nueva migración siguiendo la convención de timestamp del proyecto (ej. `1782000000000-AddScheduledForTodayToActivities.ts`).
2. En el método `up` de la migración, ejecutar `ALTER TABLE activities ADD COLUMN "scheduledForToday" boolean NOT NULL DEFAULT false`.
3. En el método `down`, revertir con `ALTER TABLE activities DROP COLUMN "scheduledForToday"`.
4. En `activity.entity.ts`, agregar el campo con el decorador `@Column`, tipo `boolean` y default `false`.
5. Ejecutar la migración con `npx typeorm migration:run -d src/data-source.ts` para validar que aplica sin errores.

**Archivos:**
- Crear: `backend/src/migrations/1782000000000-AddScheduledForTodayToActivities.ts`
- Editar: `backend/src/activities/entities/activity.entity.ts`

---

## Fase 2 — DTO y lógica de servicio

**Objetivo:** Exponer el campo a través del API REST y ampliar la consulta `findToday` para incluir actividades programadas manualmente.

**Pasos:**

1. En `create-activity.dto.ts`, agregar el campo `scheduledForToday?: boolean` con los decoradores `@IsBoolean()` y `@IsOptional()`, y su `@ApiPropertyOptional`.
2. `UpdateActivityDto` es `PartialType(CreateActivityDto)` — el campo queda disponible para `PATCH` sin cambio adicional.
3. En `activities.service.ts`, método `findToday`: reemplazar el WHERE por un OR que combine la condición de fechas existente con `(activity.scheduledForToday = true AND activity.status != 'completed')`. Usar paréntesis explícitos para que la lógica existente de fechas no se altere.
4. Verificar que `sanitizeByType` no necesita modificarse — `scheduledForToday` aplica a todos los tipos y no debe ser limpiado.

**Archivos:**
- Editar: `backend/src/activities/dto/create-activity.dto.ts`
- Editar: `backend/src/activities/activities.service.ts`

---

## Fase 3 — MCP (paridad de herramientas IA)

**Objetivo:** Que los agentes IA puedan leer y escribir el campo mediante las tools existentes, sin crear tools nuevas.

**Pasos:**

1. En `mcp.service.ts`, en el schema del tool `create_activity`, agregar `scheduledForToday` como campo boolean opcional.
2. En el schema del tool `update_activity`, agregar `scheduledForToday` como campo boolean opcional.
3. No se requieren cambios en los handlers — ya pasan el DTO completo al servicio.

**Archivos:**
- Editar: `backend/src/mcp/mcp.service.ts`

---

## Fase 4 — Tipos frontend

**Objetivo:** Alinear las interfaces TypeScript con la nueva forma de la entidad sin romper la compilación.

**Pasos:**

1. En `src/types/index.ts`, agregar `scheduledForToday: boolean` a la interfaz `Activity`.
2. En la misma interfaz `CreateActivityDto`, agregar `scheduledForToday?: boolean`.
3. `UpdateActivityDto` es `Partial<CreateActivityDto>` — queda actualizado automáticamente.

**Archivos:**
- Editar: `frontend/src/types/index.ts`

---

## Fase 5 — Componente ActivityCard (interacción principal)

**Objetivo:** Dar al usuario un control visual claro y ergonómico para programar una actividad para hoy desde cualquier vista.

**Pasos:**

1. Agregar un icono SVG de sol o calendario-hoy en la sección de iconos del archivo, siguiendo el estilo de los existentes (`w-3.5 h-3.5 shrink-0`).
2. En Row 1 del card (zona de acciones junto a Editar y Eliminar), agregar el control "Para hoy":
   - Estado inactivo (`scheduledForToday = false`): ícono + texto "Para hoy" en tono neutro (gris), indicando que la acción está disponible.
   - Estado activo (`scheduledForToday = true`): control resaltado en tono de marca (azul o amarillo), indicando que ya está programada para hoy.
   - Al hacer clic, llama a `useUpdateActivity` con `{ scheduledForToday: !activity.scheduledForToday }`.
   - Muestra spinner de carga mientras `isPending` es verdadero.
3. Instanciar `useUpdateActivity` localmente dentro del card para este control, siguiendo el mismo patrón que `StatusDropdown`.
4. No crear un hook `useScheduleForToday` separado — `useUpdateActivity` ya invalida la query key `['activities']` en `onSuccess`, lo que refrescará `TodayView` automáticamente al marcar o desmarcar.

**Archivos:**
- Editar: `frontend/src/components/ActivityCard.tsx`

---

## Fase 6 — Vista TodayView (distinción visual)

**Objetivo:** Comunicar al usuario por qué cada actividad aparece en la vista "Hoy", diferenciando las de fecha natural de las marcadas manualmente.

**Pasos:**

1. Separar el array `visible` en dos grupos:
   - Actividades que aparecen por fecha (`actionDate` o `dueDate` dentro del rango de hoy).
   - Actividades que aparecen únicamente por `scheduledForToday = true` y cuya fecha no es hoy.
2. Renderizar los dos grupos con un separador visual y encabezados de sección: uno para las actividades del día y otro para las programadas manualmente (ej. "Agregadas para hoy").
3. Omitir el encabezado de una sección si su grupo queda vacío.
4. Conservar el filtro existente `!a.parent && a.status !== 'completed'` en ambos grupos.

**Archivos:**
- Editar: `frontend/src/pages/TodayView.tsx`

---

## Orden de implementación y dependencias

Las fases deben ejecutarse en este orden. En ningún punto intermedio el sistema queda roto gracias al `DEFAULT false` que hace que las actividades existentes ignoren el nuevo campo hasta que el usuario interactúe.

```
Fase 1 (migración + entidad)
  └── Fase 2 (DTO + servicio)     ← requiere campo en BD
        ├── Fase 3 (MCP)           ← requiere campo en DTO
        └── Fase 4 (tipos TS)      ← puede ir en paralelo con Fase 2
              └── Fase 5 (Card)    ← requiere tipos actualizados
                    └── Fase 6 (TodayView) ← requiere Card + servicio
```

Las Fases 1 a 3 son backend puro y pueden completarse sin tocar el frontend. Las Fases 4 a 6 son frontend puro y pueden trabajarse en una sola sesión una vez que el API está actualizado.
