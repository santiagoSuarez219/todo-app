# test-022 — Búsqueda de tareas y gastos

## Casos de prueba

### TC-001 — Dashboard: búsqueda global de tareas
**Precondición:** Dashboard cargado con al menos 5 tareas activas.
**Pasos:**
1. Desplazarse a la sección "Todas las tareas".
2. Escribir en el SearchBar "test" (menos de 2 caracteres) y verificar que no se dispara la búsqueda.
3. Escribir "test" completo (2 caracteres) y esperar debounce (300ms).
4. Verificar que el resultado filtra tareas que matchean "test" en nombre, descripción o proyecto.
5. Validar que los tabs (Todas, Pendientes, En progreso, etc.) siguen filtrando sobre los resultados de búsqueda.
6. Limpiar el input y verificar que vuelve a mostrar la lista original.
**Resultado esperado:** 
- La búsqueda no se ejecuta con menos de 2 caracteres.
- Con 2+ caracteres, muestra solo tareas del servidor que coinciden.
- Los tabs aplican filtro sobre los resultados de búsqueda.
- Al limpiar, se restaura el estado inicial.
**Estado:** ⬜ Pendiente

### TC-002 — Dashboard: sin resultados en búsqueda
**Precondición:** Dashboard con tareas cargadas.
**Pasos:**
1. Escribir en el SearchBar un término que no existe: "xyzabc123".
2. Esperar debounce.
3. Verificar que muestra EmptyState con mensaje "No hay resultados para 'xyzabc123'."
**Resultado esperado:** EmptyState diferencia búsqueda vacía de "sin tareas en categoría".
**Estado:** ⬜ Pendiente

### TC-003 — ProjectDetail: búsqueda dentro del proyecto
**Precondición:** ProjectDetail de un proyecto con al menos 5 tareas.
**Pasos:**
1. Desplazarse a la sección de actividades.
2. Escribir en el SearchBar un término (ej. "backend").
3. Verificar que filtra solo tareas de **este proyecto** que coinciden.
4. Cambiar el tab (ej. a "Pendientes") y validar que filtra dentro de la búsqueda.
5. Los stat cards (hoy, semana, vencidas) se mantienen con los contadores del **proyecto completo**, no de la búsqueda.
6. Limpiar el SearchBar y restaurar al estado inicial.
**Resultado esperado:** 
- La búsqueda es por proyecto (no global).
- Los tabs aplican filtro sobre búsqueda.
- Los stats no cambian con la búsqueda.
**Estado:** ⬜ Pendiente

### TC-004 — ProjectDetail: aislamiento por proyecto
**Precondición:** Dos proyectos (A y B) cada uno con tareas que contienen "task" en el nombre.
**Pasos:**
1. Navegar a ProjectDetail de Proyecto A.
2. Buscar "task".
3. Verificar que solo muestra tareas de Proyecto A.
4. Navegar a ProjectDetail de Proyecto B.
5. Buscar "task" nuevamente.
6. Verificar que solo muestra tareas de Proyecto B.
**Resultado esperado:** La búsqueda está aislada por proyecto (parámetro `projectId` en el backend).
**Estado:** ⬜ Pendiente

### TC-005 — ExpensesView: búsqueda por descripción
**Precondición:** ExpensesView con gastos del mes actual (ej. 5+ gastos).
**Pasos:**
1. Escribir en el SearchBar un término que aparece en descripción de gastos (ej. "comida").
2. Verificar que filtra gastos cuya descripción contiene "comida".
3. Validar que los selects de mes/año siguen delimitando el rango (búsqueda se combina con month/year, no los reemplaza).
4. Cambiar de mes y verificar que la búsqueda se refina en el nuevo mes.
5. Limpiar el SearchBar.
**Resultado esperado:** 
- La búsqueda refina dentro del mes/año seleccionado.
- Es combinable con los filtros existentes.
**Estado:** ⬜ Pendiente

### TC-006 — ExpensesView: sin resultados en mes
**Precondición:** ExpensesView en un mes sin gastos.
**Pasos:**
1. Navegar a ExpensesView.
2. Seleccionar un mes sin gastos registrados.
3. Verificar EmptyState: "No hay gastos en [Mes] [Año]."
4. Escribir un término de búsqueda en el SearchBar.
5. Verificar EmptyState: "No hay resultados para '[término]' en [Mes] [Año]."
**Resultado esperado:** EmptyState diferencia "mes sin gastos" de "búsqueda sin resultados".
**Estado:** ⬜ Pendiente

### TC-007 — SearchBar: icono de lupa y botón X
**Precondición:** Cualquier página con SearchBar (Dashboard, ProjectDetail o ExpensesView).
**Pasos:**
1. Verificar que el SearchBar muestra un icono de lupa a la izquierda.
2. Escribir texto.
3. Verificar que aparece un botón X a la derecha (solo cuando hay texto).
4. Hacer clic en el botón X.
5. Verificar que limpia el input y restaura la lista original.
**Resultado esperado:** Componente SearchBar funciona según el spec.
**Estado:** ⬜ Pendiente

### TC-008 — SearchBar: dark mode
**Precondición:** Aplicación en modo oscuro.
**Pasos:**
1. Navegar a cualquier página con SearchBar.
2. Verificar que el input tiene fondo gris-700 (dark:bg-gray-700).
3. Verificar que el texto es blanco (dark:text-white).
4. Verificar que el icono y botón X tienen color gris-500 (dark:text-gray-500).
5. Cambiar a modo claro.
6. Verificar que los colores se ajustan correctamente.
**Resultado esperado:** SearchBar respeta los tokens de dark mode definidos en DESIGN.md.
**Estado:** ⬜ Pendiente

### TC-009 — Debounce: Network tab
**Precondición:** Dashboard o ProjectDetail abierto, Network tab del navegador visible.
**Pasos:**
1. Escribir en el SearchBar letra por letra (ej. "t", "e", "s", "t").
2. Observar en Network tab.
3. Verificar que NO hay 4 requests (uno por letra).
4. Esperar 300ms después de la última letra.
5. Verificar que hay exactamente 1 request con `/activities/search/test`.
**Resultado esperado:** useDebounce funciona correctamente con delay de 300ms.
**Estado:** ⬜ Pendiente

---

## Casos MCP

### TC-MCP-001 — search_activities con projectId
**Herramienta probada:** `search_activities` en `todo-api` MCP.
**Precondición:** Proyecto existente con UUID conocido; al menos 5 tareas, algunas coinciden con término de búsqueda.
**Input de prueba:**
```json
{
  "query": "backend",
  "projectId": "<uuid-del-proyecto>",
  "limit": 20,
  "page": 1
}
```
**Output esperado:**
- Array de actividades del proyecto especificado que coinciden con "backend".
- Sin tareas de otros proyectos.
- Respeta `limit` y `page`.
**Estado:** ⬜ Pendiente

### TC-MCP-002 — search_activities sin projectId
**Herramienta probada:** `search_activities` sin parámetro `projectId`.
**Input de prueba:**
```json
{
  "query": "tarea",
  "limit": 20,
  "page": 1
}
```
**Output esperado:**
- Array de actividades de **todos los proyectos** que coinciden con "tarea".
- Valida retrocompatibilidad (sin `projectId`, igual que antes).
**Estado:** ⬜ Pendiente

### TC-MCP-003 — list_expenses con search + year + month
**Herramienta probada:** `list_expenses` en `todo-api` MCP.
**Precondición:** Gastos registrados en un mes específico (ej. jul/2026).
**Input de prueba:**
```json
{
  "year": 2026,
  "month": 7,
  "search": "comida",
  "limit": 20,
  "page": 1
}
```
**Output esperado:**
- Array de gastos cuya descripción contiene "comida" en jul/2026.
- Combina filtros year, month y search con AND.
- Respeta `limit` y `page`.
**Estado:** ⬜ Pendiente

### TC-MCP-004 — list_expenses sin search (retrocompat)
**Herramienta probada:** `list_expenses` sin parámetro `search`.
**Input de prueba:**
```json
{
  "year": 2026,
  "month": 7,
  "limit": 20,
  "page": 1
}
```
**Output esperado:**
- Array de gastos en jul/2026 (igual que antes).
- Sin cambios en comportamiento.
**Estado:** ⬜ Pendiente

### TC-MCP-005 — list_expenses sin resultados
**Herramienta probada:** `list_expenses` con búsqueda que no tiene coincidencias.
**Input de prueba:**
```json
{
  "year": 2026,
  "month": 7,
  "search": "xyzabc123",
  "limit": 20
}
```
**Output esperado:**
- Array vacío `[]`.
- Sin errores.
**Estado:** ⬜ Pendiente

---

## Resumen de cambios

- **Backend:** Fases 1–2 completadas (búsqueda actividades con projectId, búsqueda gastos con search).
- **Frontend:** Fase 3 completada (SearchBar, useDebounce, tipos, servicios y hooks).
- **Frontend:** Fase 5 completada (integración en Dashboard, ProjectDetail, ExpensesView).
- **MCP:** Fase 4 completada (tools actualizadas en `todo-api`).
- **Documentación:** Este archivo de pruebas.

Próximos pasos:
1. Ejecutar casos TC-001 a TC-009 en el navegador.
2. Ejecutar casos TC-MCP-001 a TC-MCP-005 contra el MCP `todo-api`.
3. Marcar especificaciones como `[DONE]` tras aprobación.
