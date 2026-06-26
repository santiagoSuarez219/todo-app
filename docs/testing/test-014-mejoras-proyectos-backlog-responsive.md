# test-014 — Mejoras en proyectos, backlog y responsive

## Casos de prueba

---

### TC-001 — Proyecto pre-seleccionado al crear actividad desde ProjectDetail
**Precondición:** Existe al menos un proyecto activo. El usuario está en la vista de detalle de ese proyecto (`/projects/:id`).
**Pasos:**
1. Hacer clic en el botón "+ Actividad".
2. Observar el selector de proyecto en el formulario que se abre.
**Resultado esperado:** El selector de proyecto muestra el proyecto actual pre-seleccionado.
**Estado:** ✅ Aprobado

---

### TC-002 — El proyecto pre-seleccionado puede cambiarse
**Precondición:** Igual que TC-001.
**Pasos:**
1. Hacer clic en "+ Actividad" desde el detalle de un proyecto.
2. Cambiar manualmente el selector de proyecto a otro proyecto distinto.
3. Completar el nombre y guardar.
**Resultado esperado:** La actividad se crea asociada al proyecto seleccionado manualmente, no al proyecto original.
**Estado:** ✅ Aprobado

---

### TC-003 — Botón "Limpiar completadas" no aparece sin completadas
**Precondición:** El usuario está en la vista de detalle de un proyecto que no tiene actividades con estado "completada".
**Pasos:**
1. Observar los botones del header del proyecto.
**Resultado esperado:** El botón "Limpiar completadas" no aparece en el header.
**Estado:** ✅ Aprobado

---

### TC-004 — Botón "Limpiar completadas" aparece cuando hay completadas
**Precondición:** El usuario está en la vista de detalle de un proyecto que tiene al menos una actividad completada.
**Pasos:**
1. Observar los botones del header del proyecto.
**Resultado esperado:** Aparece el botón "Limpiar completadas (N)" donde N es el número de actividades completadas.
**Estado:** ✅ Aprobado

---

### TC-005 — Confirmación antes de limpiar completadas
**Precondición:** Hay actividades completadas en el proyecto activo.
**Pasos:**
1. Hacer clic en "Limpiar completadas".
2. Observar el diálogo que aparece.
**Resultado esperado:** Aparece un `ConfirmDialog` con el título "Limpiar actividades completadas" y el mensaje indicando la cantidad de actividades a eliminar. El botón de confirmación dice "Limpiar".
**Estado:** ✅ Aprobado

---

### TC-006 — Cancelar limpieza no elimina nada
**Precondición:** Igual que TC-005.
**Pasos:**
1. Hacer clic en "Limpiar completadas".
2. Hacer clic en "Cancelar" en el diálogo de confirmación.
**Resultado esperado:** El diálogo se cierra y ninguna actividad es eliminada. El botón "Limpiar completadas" sigue visible.
**Estado:** ✅ Aprobado

---

### TC-007 — Limpiar completadas elimina solo las completadas
**Precondición:** El proyecto tiene 2 actividades completadas y 3 en otros estados (pendiente, en progreso, etc.).
**Pasos:**
1. Hacer clic en "Limpiar completadas".
2. Confirmar en el diálogo.
**Resultado esperado:** Las 2 actividades completadas desaparecen de la lista. Las 3 restantes permanecen intactas. El botón "Limpiar completadas" desaparece del header.
**Estado:** ✅ Aprobado

---

### TC-008 — BacklogView muestra ActivityCard estándar
**Precondición:** El backlog tiene al menos una actividad.
**Pasos:**
1. Navegar a la ruta `/activities/backlog`.
2. Observar las tarjetas de actividad.
**Resultado esperado:** Las tarjetas tienen el mismo aspecto que en las vistas Today, This Week y Overdue (componente `ActivityCard`). No hay tarjetas de formato antiguo (solo nombre + botón de asignar proyecto).
**Estado:** ✅ Aprobado

---

### TC-009 — Edición inline desde BacklogView
**Precondición:** Hay al menos una actividad en el backlog.
**Pasos:**
1. Navegar al backlog.
2. Hacer clic en el nombre de una actividad para editarlo inline.
3. Cambiar el nombre y confirmar.
**Resultado esperado:** El nombre de la actividad se actualiza sin recargar la página.
**Estado:** ✅ Aprobado

---

### TC-010 — Card inline de creación rápida al final del backlog
**Precondición:** El usuario está en la vista backlog.
**Pasos:**
1. Observar el final de la lista de actividades.
2. Hacer clic en la card con el signo "+".
**Resultado esperado:** La card se transforma en un campo de texto con borde azul, un botón "Agregar" y un enlace "Cancelar". No se abre ningún modal.
**Estado:** ✅ Aprobado

---

### TC-011 — Crear actividad rápida desde la card inline
**Precondición:** La card inline está activa (campo de texto visible).
**Pasos:**
1. Escribir el nombre de la tarea.
2. Hacer clic en "Agregar" (o presionar Enter).
**Resultado esperado:** La actividad se crea y aparece en la lista. El campo de texto se limpia y permanece enfocado para permitir agregar otra tarea inmediatamente.
**Estado:** ✅ Aprobado

---

### TC-012 — Grid de 1 columna en mobile (TodayView)
**Precondición:** El navegador está en viewport mobile (< 640px de ancho).
**Pasos:**
1. Navegar a `/activities/today`.
2. Observar la disposición de las tarjetas.
**Resultado esperado:** Las tarjetas se muestran en una sola columna, sin cortes ni scroll horizontal.
**Estado:** ✅ Aprobado

---

### TC-013 — Grid de 2 columnas en tablet (TodayView)
**Precondición:** El navegador está en viewport tablet (640px–1023px de ancho).
**Pasos:**
1. Navegar a `/activities/today` con el viewport en rango tablet.
2. Observar la disposición de las tarjetas.
**Resultado esperado:** Las tarjetas se organizan en 2 columnas.
**Estado:** ✅ Aprobado

---

### TC-014 — Grid de 3 columnas en desktop (TodayView)
**Precondición:** El navegador está en viewport desktop (≥ 1024px de ancho).
**Pasos:**
1. Navegar a `/activities/today`.
2. Observar la disposición de las tarjetas.
**Resultado esperado:** Las tarjetas se organizan en 3 columnas.
**Estado:** ✅ Aprobado

---

### TC-015 — Grid responsive en WeekView
**Precondición:** La vista `Esta semana` tiene actividades.
**Pasos:**
1. Navegar a `/activities/this-week`.
2. Redimensionar el navegador desde mobile hasta desktop.
**Resultado esperado:** 1 columna en mobile, 2 en tablet, 3 en desktop. Sin scroll horizontal en ningún tamaño.
**Estado:** ✅ Aprobado

---

### TC-016 — Grid responsive en OverdueView
**Precondición:** La vista `Vencidas` tiene actividades.
**Pasos:**
1. Navegar a `/activities/overdue`.
2. Redimensionar el navegador desde mobile hasta desktop.
**Resultado esperado:** 1 columna en mobile, 2 en tablet, 3 en desktop.
**Estado:** ✅ Aprobado

---

### TC-017 — Grid responsive en BacklogView
**Precondición:** El backlog tiene actividades.
**Pasos:**
1. Navegar a `/activities/backlog`.
2. Redimensionar el navegador desde mobile hasta desktop.
**Resultado esperado:** 1 columna en mobile, 2 en tablet, 3 en desktop.
**Estado:** ✅ Aprobado

---

### TC-018 — Grid responsive en ProjectDetail
**Precondición:** Un proyecto tiene actividades.
**Pasos:**
1. Navegar al detalle de un proyecto.
2. Redimensionar el navegador desde mobile hasta desktop.
**Resultado esperado:** La lista de actividades del proyecto muestra 1 columna en mobile, 2 en tablet, 3 en desktop. Las stat cards (Hoy / Esta semana / Vencidas) mantienen su grid propio (1 col mobile, 3 col desktop).
**Estado:** ✅ Aprobado
