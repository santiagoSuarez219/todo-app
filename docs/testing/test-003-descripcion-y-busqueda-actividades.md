# test-003 — Campo Descripción y Búsqueda de Actividades

## Casos de prueba

### TC-001 — Agregar descripción al crear actividad
**Precondición:** Estar en cualquier vista con botón "Nueva actividad".
**Pasos:**
1. Abrir el modal de nueva actividad.
2. Completar el campo "Descripción" con texto de más de 20 caracteres.
3. Guardar.
**Resultado esperado:** La actividad se crea con la descripción almacenada.
**Estado:** ✅ Aprobado

### TC-002 — Descripción visible en ActivityCard
**Precondición:** Existe una actividad con descripción.
**Pasos:**
1. Localizar la ActivityCard correspondiente en cualquier vista de lista.
**Resultado esperado:** Se muestra una preview de la descripción truncada a 2 líneas debajo del nombre.
**Estado:** ✅ Aprobado

### TC-003 — Buscar actividad por nombre
**Precondición:** Estar en `/activities`. Existen actividades con nombres distintos.
**Pasos:**
1. Escribir parte del nombre de una actividad en la barra de búsqueda.
**Resultado esperado:** La lista se filtra mostrando solo actividades cuyo nombre coincide.
**Estado:** ✅ Aprobado

### TC-004 — Buscar actividad por descripción
**Precondición:** Existe una actividad con descripción única.
**Pasos:**
1. Escribir en la barra de búsqueda una palabra que aparece solo en la descripción.
**Resultado esperado:** La actividad aparece en los resultados.
**Estado:** ✅ Aprobado

### TC-005 — Buscar actividad por nombre de proyecto
**Precondición:** Existen actividades asignadas a un proyecto.
**Pasos:**
1. Escribir el nombre del proyecto en la barra de búsqueda.
**Resultado esperado:** Aparecen las actividades asociadas a ese proyecto.
**Estado:** ✅ Aprobado

### TC-006 — Limpiar búsqueda restaura la lista completa
**Precondición:** Hay texto en la barra de búsqueda.
**Pasos:**
1. Borrar el texto de la barra de búsqueda.
**Resultado esperado:** La lista vuelve a mostrar todas las actividades paginadas.
**Estado:** ✅ Aprobado
