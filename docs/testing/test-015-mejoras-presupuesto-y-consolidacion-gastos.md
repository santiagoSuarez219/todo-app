# test-015 — Mejoras al presupuesto y consolidación de gastos mensuales

## Casos de prueba

### TC-001 — Edición inline: activar modo edición
**Precondición:** Existe un presupuesto con al menos un ítem.
**Pasos:**
1. Ir a la vista de detalle de un presupuesto.
2. Pasar el cursor sobre cualquier fila de la tabla de ítems.
3. Hacer clic en el ícono de lápiz que aparece al hacer hover.
**Resultado esperado:** La fila se convierte en campos editables (input de texto para descripción, input numérico para monto, select para tipo). Aparecen los botones de guardar (✓) y cancelar (✗).
**Estado:** ⬜ Pendiente

---

### TC-002 — Edición inline: guardar cambios
**Precondición:** Una fila está en modo edición (TC-001 completado).
**Pasos:**
1. Modificar la descripción, el monto y/o el tipo del ítem.
2. Hacer clic en el botón de guardar (✓).
**Resultado esperado:** La fila vuelve al modo lectura mostrando los valores actualizados. El resumen por tipo y el total planificado se actualizan si el monto o tipo cambiaron.
**Estado:** ⬜ Pendiente

---

### TC-003 — Edición inline: cancelar sin guardar
**Precondición:** Una fila está en modo edición.
**Pasos:**
1. Modificar uno o más campos.
2. Hacer clic en el botón de cancelar (✗).
**Resultado esperado:** La fila vuelve al modo lectura con los valores originales sin cambios.
**Estado:** ⬜ Pendiente

---

### TC-004 — Edición inline: bloqueo de otras filas durante edición
**Precondición:** Existe un presupuesto con al menos dos ítems.
**Pasos:**
1. Activar el modo edición en una fila.
2. Intentar hacer clic en el lápiz o en el ícono de eliminar de otra fila.
**Resultado esperado:** Los botones de las demás filas están deshabilitados (opacidad reducida) y no responden al clic mientras hay una fila en edición.
**Estado:** ⬜ Pendiente

---

### TC-005 — Edición inline: validación de campos vacíos
**Precondición:** Una fila está en modo edición.
**Pasos:**
1. Borrar completamente el contenido del campo descripción.
2. Intentar hacer clic en el botón de guardar (✓).
**Resultado esperado:** El botón de guardar está deshabilitado y no dispara ninguna petición.
**Estado:** ⬜ Pendiente

---

### TC-006 — Edición inline: validación de monto inválido
**Precondición:** Una fila está en modo edición.
**Pasos:**
1. Cambiar el monto a 0 o a un valor negativo.
2. Intentar hacer clic en el botón de guardar (✓).
**Resultado esperado:** El botón de guardar está deshabilitado y no dispara ninguna petición.
**Estado:** ⬜ Pendiente

---

### TC-007 — Resumen por tipo: porcentaje sobre ingresos
**Precondición:** El mes del presupuesto tiene al menos un ingreso registrado en la sección de Ingresos.
**Pasos:**
1. Ir a la vista de detalle del presupuesto.
2. Observar la sección "Resumen por tipo".
**Resultado esperado:** Cada tipo muestra su total en COP y su porcentaje calculado sobre el total de ingresos del mes. La fila "Total planificado" también muestra su porcentaje.
**Estado:** ⬜ Pendiente

---

### TC-008 — Resumen por tipo: sin ingresos
**Precondición:** El mes del presupuesto no tiene ingresos registrados.
**Pasos:**
1. Ir a la vista de detalle del presupuesto.
2. Observar la sección "Resumen por tipo".
**Resultado esperado:** La sección muestra solo los totales por tipo en COP, sin columna de porcentaje.
**Estado:** ⬜ Pendiente

---

### TC-009 — Sección "Gastos del mes": con presupuesto y gastos variables
**Precondición:** El mes del presupuesto tiene ítems de presupuesto y al menos un gasto variable registrado en la sección de Gastos con fecha dentro del mismo mes y año.
**Pasos:**
1. Ir a la vista de detalle del presupuesto.
2. Observar la sección "Gastos del mes".
**Resultado esperado:** Se muestran tres filas: "Presupuesto (fijos)" con la suma de ítems, "Gastos variables" con la suma de gastos del mes, y "Total del mes" con la suma de ambos. Si hay ingresos, también se muestra el porcentaje de cada fila.
**Estado:** ⬜ Pendiente

---

### TC-010 — Sección "Gastos del mes": sin gastos variables
**Precondición:** El mes del presupuesto no tiene gastos variables registrados.
**Pasos:**
1. Ir a la vista de detalle del presupuesto.
2. Observar la sección "Gastos del mes".
**Resultado esperado:** La sección se muestra igualmente. "Gastos variables" aparece en $0 y "Total del mes" es igual al total del presupuesto.
**Estado:** ⬜ Pendiente

---

### TC-011 — Sección "Gastos del mes": totales correctos
**Precondición:** El mes tiene presupuesto con ítems por un monto conocido (ej. $1.000.000) y gastos variables por un monto conocido (ej. $500.000).
**Pasos:**
1. Ir a la vista de detalle del presupuesto.
2. Verificar los valores en la sección "Gastos del mes".
**Resultado esperado:** "Presupuesto (fijos)" = $1.000.000, "Gastos variables" = $500.000, "Total del mes" = $1.500.000.
**Estado:** ⬜ Pendiente

---

### TC-012 — Sección "Gastos del mes": se actualiza al editar un ítem
**Precondición:** La sección "Gastos del mes" está visible con valores conocidos.
**Pasos:**
1. Editar el monto de un ítem del presupuesto (TC-002 completado).
2. Guardar el cambio.
3. Observar la sección "Gastos del mes".
**Resultado esperado:** El valor de "Presupuesto (fijos)" y el "Total del mes" se actualizan para reflejar el nuevo monto del ítem.
**Estado:** ⬜ Pendiente
