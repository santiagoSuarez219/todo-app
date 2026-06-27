# test-004 — Tipos de Proyecto y Campo Favorito

## Casos de prueba

### TC-001 — Crear proyecto con tipo
**Precondición:** Estar en `/projects`. Existen tipos de proyecto (Desarrollo, Investigación, Docencia, Estudio).
**Pasos:**
1. Hacer clic en "Nuevo proyecto".
2. Seleccionar un tipo en el selector "Tipo".
3. Guardar.
**Resultado esperado:** El proyecto se crea y muestra el badge de tipo con su color correspondiente.
**Estado:** ✅ Aprobado

### TC-002 — Cambiar tipo de proyecto existente
**Precondición:** Existe un proyecto con tipo asignado.
**Pasos:**
1. Abrir el formulario de edición del proyecto.
2. Cambiar el tipo a otro diferente.
3. Guardar.
**Resultado esperado:** El badge del proyecto refleja el nuevo tipo.
**Estado:** ✅ Aprobado

### TC-003 — Marcar proyecto como favorito
**Precondición:** Existe un proyecto sin marcar como favorito.
**Pasos:**
1. En la lista de proyectos, hacer clic en el botón de estrella del proyecto.
**Resultado esperado:** La estrella se pone amarilla y el proyecto aparece en la sección de favoritos.
**Estado:** ✅ Aprobado

### TC-004 — Desmarcar proyecto favorito
**Precondición:** Existe un proyecto marcado como favorito.
**Pasos:**
1. Hacer clic nuevamente en la estrella del proyecto favorito.
**Resultado esperado:** La estrella vuelve a gris y el proyecto sale de la sección de favoritos.
**Estado:** ✅ Aprobado

### TC-005 — Badge de tipo visible en ProjectDetail
**Precondición:** Existe un proyecto con tipo asignado.
**Pasos:**
1. Navegar al detalle del proyecto (`/projects/:id`).
**Resultado esperado:** El header muestra el badge de tipo con el color correcto.
**Estado:** ✅ Aprobado
