# spec-014 — [DONE] Mejoras en proyectos, backlog y responsive

## Contexto

Durante el uso del módulo de actividades y proyectos se identificaron tres fricciones:

1. Al crear una actividad desde la vista de un proyecto, el formulario no pre-asigna ese proyecto, obligando al usuario a seleccionarlo manualmente.
2. No existe forma de limpiar en bloque las actividades completadas de un proyecto.
3. La vista Backlog usa un componente propio (`BacklogCard`) con funcionalidad limitada, mientras que el resto de vistas usan `ActivityCard` con edición rápida inline. Esto genera inconsistencia de UX.
4. Los grids de actividades en todas las vistas usan una sola columna independientemente del tamaño de pantalla, desaprovechando el espacio en tablets y escritorio.

## Alcance

- Pre-asignar proyecto al abrir el modal "Nueva actividad" desde `ProjectDetail`.
- Botón en `ProjectDetail` para eliminar en bloque las actividades completadas del proyecto activo.
- Reemplazar `BacklogCard` por `ActivityCard` estándar en `BacklogView`.
- Hacer el grid de actividades responsive en todas las vistas: `TodayView`, `WeekView`, `OverdueView`, `BacklogView` y `ProjectDetail`.

## Lo que NO incluye este spec

- Cambios en el backend.
- Edición de actividades en lote (más allá de la eliminación de completadas).
- Arrastrar y soltar actividades entre proyectos.
- Cambios en `ActivityCard` en sí misma.

## Impacto en el sistema

- **`ProjectDetail.tsx`** — pasar `projectId` como `defaultValues` al `ActivityForm`; agregar botón y lógica para eliminar completadas; ajustar grid a responsive.
- **`ActivityForm.tsx`** — aceptar una prop `defaultProjectId` para pre-seleccionar el proyecto en el selector.
- **`BacklogView.tsx`** — eliminar `BacklogCard`, `QuickAddForm` y `ProjectDropdown`; reemplazar por `ActivityCard` con modal `ActivityForm` estándar; ajustar grid a responsive.
- **`TodayView.tsx`**, **`WeekView.tsx`**, **`OverdueView.tsx`** — ajustar grid a responsive.

---

## Fases de implementación

### Fase 1 — Pre-asignar proyecto al crear actividad desde ProjectDetail

- [x] Editar `frontend/src/components/ActivityForm.tsx` — agregar prop opcional `defaultProjectId?: string`; usarla en `defaultValues` del formulario para pre-seleccionar el proyecto en el campo `projectId`.
- [x] Editar `frontend/src/pages/ProjectDetail.tsx` — pasar `defaultProjectId={project.id}` al `<ActivityForm>` del modal "Nueva actividad".

### Fase 2 — Eliminar actividades completadas de un proyecto

- [x] Editar `frontend/src/pages/ProjectDetail.tsx` — agregar botón "Limpiar completadas" visible únicamente cuando existen actividades con `status === 'completed'` en el proyecto activo.
- [x] Editar `frontend/src/pages/ProjectDetail.tsx` — al confirmar en un `ConfirmDialog`, ejecutar `deleteActivity` para cada actividad completada del proyecto; invalidar la query de actividades al terminar.

### Fase 3 — Reemplazar BacklogCard por ActivityCard en BacklogView

- [x] Editar `frontend/src/pages/BacklogView.tsx` — eliminar los componentes locales `BacklogCard`, `QuickAddForm` y `ProjectDropdown`.
- [x] Editar `frontend/src/pages/BacklogView.tsx` — reemplazar el listado por `ActivityCard` estándar (igual que en el resto de vistas).
- [x] Editar `frontend/src/pages/BacklogView.tsx` — reemplazar el botón "Nueva tarea" por el mismo patrón de modal con `ActivityForm` que usan `TodayView` y `WeekView`.

### Fase 4 — Grid responsive en todas las vistas

- [x] Editar `frontend/src/pages/TodayView.tsx` — cambiar `grid gap-3 sm:grid-cols-1` por `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`.
- [x] Editar `frontend/src/pages/WeekView.tsx` — mismo cambio de grid.
- [x] Editar `frontend/src/pages/OverdueView.tsx` — ya tenía el grid correcto, sin cambios.
- [x] Editar `frontend/src/pages/BacklogView.tsx` — mismo cambio de grid.
- [x] Editar `frontend/src/pages/ProjectDetail.tsx` — cambiar el `grid gap-3` del listado de actividades por `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`.

---

## Criterios de aceptación

- Al hacer clic en "Nueva actividad" dentro de un proyecto, el selector de proyecto del formulario muestra ese proyecto pre-seleccionado.
- El botón "Limpiar completadas" solo aparece cuando hay al menos una actividad completada en el proyecto; no aparece si no las hay.
- Al confirmar "Limpiar completadas", se eliminan únicamente las actividades con `status === 'completed'` del proyecto activo; las demás no se ven afectadas.
- La vista Backlog muestra `ActivityCard` con todas sus capacidades de edición rápida inline (nombre, prioridad, proyecto), igual que el resto de vistas.
- El botón "Nueva tarea" de Backlog abre el modal `ActivityForm` estándar.
- En todas las vistas (`Today`, `This Week`, `Overdue`, `Backlog`, `ProjectDetail`), el grid muestra 1 columna en mobile, 2 en tablet (`sm`) y 3 en desktop (`lg`).
- En pantallas pequeñas (mobile) ninguna card se corta ni produce scroll horizontal.
