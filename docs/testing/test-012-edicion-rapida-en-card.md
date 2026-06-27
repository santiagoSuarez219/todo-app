# test-012 — Edición rápida en ActivityCard

## Casos de prueba

### TC-001 — Editar nombre de actividad inline
**Precondición:** Existe al menos una actividad visible en cualquier vista de lista.
**Pasos:**
1. Hacer hover sobre la ActivityCard para ver el ícono de lápiz junto al nombre.
2. Hacer clic sobre el nombre de la actividad.
3. Modificar el texto en el input que aparece.
4. Presionar Enter o hacer clic fuera.
**Resultado esperado:** El nombre se actualiza inmediatamente en la card sin abrir ningún modal.
**Estado:** ✅ Aprobado

### TC-002 — Cancelar edición de nombre con Escape
**Precondición:** El input de nombre está activo en una card.
**Pasos:**
1. Modificar el texto del nombre.
2. Presionar Escape.
**Resultado esperado:** El input desaparece y el nombre vuelve al valor original sin guardar cambios.
**Estado:** ✅ Aprobado

### TC-003 — Editar prioridad inline
**Precondición:** Existe una actividad visible en lista.
**Pasos:**
1. Hacer clic sobre el badge de prioridad de la actividad.
2. Seleccionar una prioridad diferente en el dropdown.
**Resultado esperado:** El badge de prioridad se actualiza al nuevo valor inmediatamente.
**Estado:** ✅ Aprobado

### TC-004 — Editar proyecto asignado inline
**Precondición:** Existe una actividad con o sin proyecto asignado.
**Pasos:**
1. Hacer clic sobre el chip de proyecto (o el botón "+ Proyecto" si no tiene).
2. Seleccionar un proyecto diferente del dropdown.
**Resultado esperado:** El chip de proyecto en la card se actualiza al proyecto seleccionado.
**Estado:** ✅ Aprobado

### TC-005 — Quitar proyecto asignado inline
**Precondición:** Existe una actividad con proyecto asignado.
**Pasos:**
1. Hacer clic sobre el chip de proyecto.
2. Seleccionar "Sin proyecto" en el dropdown.
**Resultado esperado:** El chip de proyecto desaparece y aparece el botón "+ Proyecto".
**Estado:** ✅ Aprobado

### TC-006 — No se dispara mutación si el valor no cambió
**Precondición:** Existe una actividad con nombre "Tarea de prueba".
**Pasos:**
1. Hacer clic sobre el nombre, no modificar el texto, presionar Enter.
**Resultado esperado:** No se realiza ninguna llamada al backend; la card permanece igual.
**Estado:** ✅ Aprobado
