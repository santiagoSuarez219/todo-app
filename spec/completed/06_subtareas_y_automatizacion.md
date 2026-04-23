# Spec 06 — Subtareas UI y Campo `automatizacion`

## Principios del Plan

Cada fase produce un conjunto coherente y commitable de cambios. Las fases del backend preceden a las del frontend. Dentro de cada feature, el orden es: tipos → persistencia → lógica → interfaz.

---

## Feature 2: Campo `automatizacion` (prioridad primero, es base para el form)

### Fase 1 — Backend: Enum y Entidad

**Objetivo:** Definir el enum e incorporar el campo a la entidad Activity.

Archivos a editar:
- `backend/src/activities/entities/activity.entity.ts` — declarar el enum `Automatizacion` y agregar la columna `automatizacion` como nullable (para no romper registros existentes)

**Resultado:** La entidad refleja el nuevo campo; TypeORM lo conoce pero aún no está en base de datos.

- [x] Implementado

---

### Fase 2 — Backend: DTO y Migración

**Objetivo:** Exponer el campo en la API y persistirlo en PostgreSQL.

Archivos a editar:
- `backend/src/activities/dto/create-activity.dto.ts` — agregar propiedad `automatizacion` opcional con validación `@IsEnum`
- `backend/src/migrations/` — crear migración `#3` (nombre: `AddAutomatizacionToActivities`) que ejecute `ALTER TABLE activities ADD COLUMN automatizacion VARCHAR NULL`

`update-activity.dto.ts` no requiere cambios porque extiende `PartialType(CreateActivityDto)` y hereda el campo automáticamente.

**Resultado:** El endpoint `POST /activities` acepta y persiste `automatizacion`; el endpoint `GET` lo devuelve.

- [x] Implementado

---

### Fase 3 — Frontend: Tipo y Servicio

**Objetivo:** Incorporar el nuevo campo al modelo de datos del frontend.

Archivos a editar:
- `frontend/src/types/index.ts` — agregar el literal union `Automatizacion` con los tres valores y añadir el campo `automatizacion?: Automatizacion` a la interfaz `Activity`

**Resultado:** TypeScript conoce el campo; los hooks y servicios existentes ya lo transportan sin cambios adicionales.

- [x] Implementado

---

### Fase 4 — Frontend: Formulario y Tarjeta

**Objetivo:** Permitir al usuario ver y editar el campo en la UI.

Archivos a editar:
- `frontend/src/components/ActivityForm.tsx` — agregar campo `<select>` con los tres valores usando React Hook Form + Zod; el campo es opcional
- `frontend/src/components/ActivityCard.tsx` — mostrar el badge/label de automatización cuando el valor esté presente; seguir la misma lógica visual que `priority` o `energy`

**Resultado:** Feature 2 completamente integrada en frontend.

- [x] Implementado

---

## Feature 1: UI para Subtareas

### Fase 5 — Frontend: Hook y Servicio

**Objetivo:** Completar la capa de datos para subtareas.

Archivos a editar:
- `frontend/src/services/activities.service.ts` — agregar función `createSubtask(parentId, dto)` que hace `POST /activities` con `parentId` incluido en el body
- `frontend/src/hooks/useActivities.ts` — agregar hook `useActivitySubtasks(activityId)` que consulta `GET /activities/:id/subtasks`; agregar mutation `useCreateSubtask()` que invalida las query keys del padre y de la lista de subtareas en `onSuccess`

**Resultado:** La lógica de datos para subtareas está disponible para cualquier componente.

- [x] Implementado

---

### Fase 6 — Frontend: ActivityCard con subtareas expandibles

**Objetivo:** Mostrar el conteo de subtareas y permitir expandirlas desde la tarjeta.

Archivos a editar:
- `frontend/src/components/ActivityCard.tsx`
  - Agregar botón toggle "Ver subtareas (N)" visible solo cuando la actividad tiene subtareas
  - Al expandir, montar con lazy-mount una sección que usa `useActivitySubtasks(id)` para listar subtareas anidadas
  - Cada subtarea se renderiza como un `ActivityCard` de nivel anidado (componente recursivo)
  - Agregar botón "Agregar subtarea" que abre el modal de creación

**Restricciones:**
- La sección expandida solo monta cuando el toggle está abierto (lazy-mount)
- Estado de apertura local con `useState`, sin `useMemo`

**Resultado:** Las tarjetas muestran subtareas anidadas de forma interactiva.

- [x] Implementado

---

### Fase 7 — Frontend: Modal de creación de subtarea

**Objetivo:** Permitir crear una subtarea desde el contexto de su padre.

Archivos a editar:
- `frontend/src/components/ActivityForm.tsx` — verificar que acepta `parentId` como prop o campo oculto; si no existe, agregarlo (campo oculto, no visible al usuario)
- `frontend/src/components/ActivityCard.tsx` — conectar el botón "Agregar subtarea" a un modal que renderiza `ActivityForm` con `parentId` preestablecido; el modal usa lazy-mount

**Restricciones:**
- El modal solo se monta cuando `isOpen === true`
- La mutation invalida `['activities', parentId, 'subtasks']` en `onSuccess`

**Resultado:** Feature 1 completamente funcional.

- [x] Implementado

---

## Resumen de Fases y Commits

| Fase | Scope | Commit sugerido |
|------|-------|----------------|
| 1 | Backend | `feat: add automatizacion enum to Activity entity` |
| 2 | Backend | `feat: add automatizacion DTO field and migration #3` |
| 3 | Frontend | `feat: add Automatizacion type to Activity interface` |
| 4 | Frontend | `feat: render automatizacion field in form and card` |
| 5 | Frontend | `feat: add createSubtask service and useActivitySubtasks hook` |
| 6 | Frontend | `feat: add expandable subtask list to ActivityCard` |
| 7 | Frontend | `feat: add create-subtask modal to ActivityCard` |

---

## Dependencias entre Fases

```
Fase 1 → Fase 2 (entidad antes que migración)
Fase 2 → Fase 3 (backend debe responder el campo antes de tiparlo en frontend)
Fase 3 → Fase 4 (tipos antes que UI)

Fase 5 → Fase 6 (hook antes que componente que lo consume)
Fase 6 → Fase 7 (el modal es parte de la tarjeta expandida)

Feature 2 (Fases 1-4) y Feature 1 (Fases 5-7) son independientes entre sí.
```
