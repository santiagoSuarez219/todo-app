# test-022 — Búsqueda de tareas y gastos

## Casos de prueba MCP

### TC-MCP-001 — `search_activities` sin `projectId` (búsqueda global)

**Herramienta probada:** `search_activities` en `todo-api`

**Precondición:**
- Base de datos con ≥3 actividades en proyectos diferentes, algunos con palabra clave en nombre/descripción.
  Ejemplo:
  - Proyecto "Casa": "Comprar leche" (search matches)
  - Proyecto "Trabajo": "Revisar código" (no match)
  - Proyecto "Casa": "Preparar desayuno" (no match)

**Input de prueba:**
```json
{
  "query": "Comprar"
}
```

**Output esperado:** Array con ≥1 actividades cuyo nombre/descripción contenga "Comprar" (case-insensitive), sin restricción de proyecto.

**Estado:** ⬜ Pendiente

---

### TC-MCP-002 — `search_activities` con `projectId` válido (búsqueda acotada)

**Herramienta probada:** `search_activities` en `todo-api`

**Precondición:**
- Mismo setup que TC-MCP-001.
- Conocer el UUID del proyecto "Casa".

**Input de prueba:**
```json
{
  "query": "Comprar",
  "projectId": "<UUID del proyecto Casa>"
}
```

**Output esperado:** Array que contenga SOLO actividades del proyecto "Casa" cuyo nombre/descripción contenga "Comprar". Si hay otra actividad "Comprar" en otro proyecto, NO debe aparecer.

**Estado:** ⬜ Pendiente

---

### TC-MCP-003 — `list_expenses` con `search` solo (sin year/month)

**Herramienta probada:** `list_expenses` en `todo-api`

**Precondición:**
- Base de datos con ≥3 gastos de diferentes meses/años y tipos.
  Ejemplo:
  - 2026-06-01: "Supermercado Éxito" $85.000 (basico)
  - 2026-07-05: "Netflix" $22.900 (lujo)
  - 2026-05-15: "Supermercado DIA" $45.000 (basico)

**Input de prueba:**
```json
{
  "search": "Supermercado"
}
```

**Output esperado:** Array con 2 gastos cuya descripción contenga "Supermercado", independientemente del mes/año.

**Estado:** ⬜ Pendiente

---

### TC-MCP-004 — `list_expenses` con `search` + `year` + `month` (combinados)

**Herramienta probada:** `list_expenses` en `todo-api`

**Precondición:**
- Mismo setup que TC-MCP-003.

**Input de prueba:**
```json
{
  "search": "Supermercado",
  "year": 2026,
  "month": 6
}
```

**Output esperado:** Array con SOLO 1 gasto (Supermercado Éxito de 2026-06-01). El de mayo (2026-05-15) no aparece porque no está en junio; Netflix no aparece porque no contiene "Supermercado".

**Estado:** ⬜ Pendiente

---

### TC-MCP-005 — `list_expenses` sin parámetros (comportamiento original intacto)

**Herramienta probada:** `list_expenses` en `todo-api`

**Precondición:**
- Mismo setup que TC-MCP-003.

**Input de prueba:**
```json
{}
```

**Output esperado:** Array con TODOS los gastos (sin filtrar). Comportamiento idéntico al anterior a los cambios.

**Estado:** ⬜ Pendiente

---

## Casos de prueba manuales (frontend)

### TC-001 — Dashboard: buscar por nombre devuelve tareas más allá de las 50 iniciales

**Precondición:** Dashboard con >50 tareas en la base de datos.

**Pasos:**
1. Ir a la página principal (Dashboard, `/`).
2. En la sección "Todas las tareas", escribir en la barra de búsqueda un término que coincida con una tarea más allá del límite de 50.

**Resultado esperado:** La búsqueda devuelve la tarea, confirmando que es server-side (no limitado a las 50 cargadas).

**Estado:** ⬜ Pendiente

---

### TC-002 — Dashboard: búsqueda + tab activo se combinan correctamente

**Precondición:** Dashboard con tareas de diversos estados (pending, in_progress, completed).

**Pasos:**
1. Ir a Dashboard.
2. Escribir un término que coincida con, por ejemplo, 5 tareas.
3. Cambiar el tab activo a "Pendientes".

**Resultado esperado:** Se muestran solo las tareas que coinciden con el término Y están en estado "pending". Al cambiar de tab, el filtro se aplica sobre los resultados de búsqueda.

**Estado:** ⬜ Pendiente

---

### TC-003 — Dashboard: término sin coincidencias muestra EmptyState

**Precondición:** Dashboard con tareas.

**Pasos:**
1. Ir a Dashboard.
2. Escribir un término que NO coincida con ninguna tarea (ej. "xyz123").

**Resultado esperado:** Se muestra un `EmptyState` con mensaje "Sin resultados para «xyz123»".

**Estado:** ⬜ Pendiente

---

### TC-004 — ProjectDetail: la búsqueda solo devuelve actividades del proyecto actual

**Precondición:** Dos proyectos con tareas con nombres similares. Ejemplo:
- Proyecto A: "Comprar leche"
- Proyecto B: "Comprar pan"

**Pasos:**
1. Ir a la página de detalle del Proyecto A.
2. Escribir "Comprar" en la barra de búsqueda.

**Resultado esperado:** Se muestra SOLO "Comprar leche" del Proyecto A. "Comprar pan" del Proyecto B no aparece.

**Estado:** ⬜ Pendiente

---

### TC-005 — ExpensesView: buscar dentro de un mes/año filtra en vivo

**Precondición:** ExpensesView con gastos de múltiples tipos en el mes actual.

**Pasos:**
1. Ir a `/finances/expenses`.
2. Seleccionar un mes/año específico.
3. Escribir un término en la barra de búsqueda (ej. "Mercado").

**Resultado esperado:** Se muestran solo los gastos del mes/año seleccionado cuya descripción contenga el término.

**Estado:** ⬜ Pendiente

---

### TC-006 — ExpensesView: cambiar mes/año conserva el término y re-filtra

**Precondición:** ExpensesView con gastos en múltiples meses.

**Pasos:**
1. Ir a ExpensesView.
2. Seleccionar junio 2026 y escribir "Mercado".
3. Cambiar a julio 2026 (sin limpiar la búsqueda).

**Resultado esperado:** Se muestran los gastos de julio 2026 que contengan "Mercado". El término se conserva al cambiar de mes.

**Estado:** ⬜ Pendiente

---

### TC-007 — ExpensesView: EmptyState diferencia "sin gastos en el mes" de "sin resultados para el término"

**Precondición:** ExpensesView.

**Pasos:**
1. Seleccionar un mes sin gastos y sin término de búsqueda.
2. Observar el mensaje.
3. Escribir un término en un mes con gastos pero sin coincidencias.
4. Observar el mensaje.

**Resultado esperado:**
- Caso 1: "No hay gastos en [mes] [año]."
- Caso 2: "Sin resultados para «[término]» en [mes] [año]."

**Estado:** ⬜ Pendiente

---

### TC-008 — Dark mode: SearchBar se ve correcto en claro y oscuro

**Precondición:** Navegar en themes claro y oscuro.

**Pasos:**
1. Ir a Dashboard (o ProjectDetail o ExpensesView).
2. Verificar que el SearchBar tenga estilos coherentes en light mode (input con borde gris claro, placeholder discreto).
3. Activar dark mode y repetir.

**Resultado esperado:** El SearchBar se adapta correctamente a ambos themes sin degradar legibilidad ni contraste.

**Estado:** ⬜ Pendiente

---

### TC-009 — Debounce: teclear rápido no dispara un request por tecla

**Precondición:** Dashboard o ProjectDetail con búsqueda.

**Pasos:**
1. Abrir DevTools (Network tab).
2. Ir a Dashboard.
3. Teclear rápidamente "buscar rápido" en la barra (sin pausas entre caracteres).

**Resultado esperado:** En la pestaña Network se ve solo 1–2 requests a `/activities/search/...`, no uno por cada carácter. Debounce funciona correctamente (300–400ms).

**Estado:** ⬜ Pendiente

---
