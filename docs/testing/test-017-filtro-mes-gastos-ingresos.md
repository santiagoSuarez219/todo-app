# test-017 — Filtro por mes en gastos e ingresos

## Casos de prueba

### TC-001 — Bug fix: cards de presupuesto muestran ítems y total correctamente
**Precondición:** Existe al menos un presupuesto con ítems registrados.
**Pasos:**
1. Navegar a `/finances/budgets`.
**Resultado esperado:** Cada card muestra el número real de ítems y el total en COP (no "0 ítems / $0").
**Estado:** ✅ Aprobado

---

### TC-002 — Gastos filtran por mes actual al entrar
**Precondición:** Hay gastos registrados en el mes actual y en meses anteriores.
**Pasos:**
1. Navegar a `/finances/expenses`.
**Resultado esperado:** Solo se ven los gastos del mes y año actual. Los de otros meses no aparecen.
**Estado:** ✅ Aprobado

---

### TC-003 — Cambiar mes en gastos actualiza la lista
**Precondición:** Hay gastos en al menos dos meses distintos.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Cambiar el selector de mes a otro mes con registros.
**Resultado esperado:** La lista se actualiza mostrando solo los gastos del mes seleccionado.
**Estado:** ✅ Aprobado

---

### TC-004 — Cambiar año en gastos actualiza la lista
**Precondición:** Hay gastos en distintos años.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Cambiar el selector de año.
**Resultado esperado:** La lista muestra solo los gastos del año y mes seleccionados.
**Estado:** ✅ Aprobado

---

### TC-005 — Estado vacío en gastos cuando no hay registros en el mes
**Precondición:** No hay gastos en el mes/año seleccionado.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Seleccionar un mes sin registros.
**Resultado esperado:** Se muestra el mensaje de estado vacío con el nombre del mes y año seleccionados.
**Estado:** ✅ Aprobado

---

### TC-006 — Ingresos filtran por mes actual al entrar
**Precondición:** Hay ingresos registrados en el mes actual y en meses anteriores.
**Pasos:**
1. Navegar a `/finances/incomes`.
**Resultado esperado:** Solo se ven los ingresos del mes y año actual.
**Estado:** ✅ Aprobado

---

### TC-007 — Cambiar mes en ingresos actualiza la lista
**Precondición:** Hay ingresos en al menos dos meses distintos.
**Pasos:**
1. Navegar a `/finances/incomes`.
2. Cambiar el selector de mes a otro mes con registros.
**Resultado esperado:** La lista se actualiza mostrando solo los ingresos del mes seleccionado.
**Estado:** ✅ Aprobado

---

### TC-008 — Estado vacío en ingresos cuando no hay registros en el mes
**Precondición:** No hay ingresos en el mes/año seleccionado.
**Pasos:**
1. Navegar a `/finances/incomes`.
2. Seleccionar un mes sin registros.
**Resultado esperado:** Se muestra el mensaje de estado vacío con el nombre del mes y año seleccionados.
**Estado:** ✅ Aprobado
