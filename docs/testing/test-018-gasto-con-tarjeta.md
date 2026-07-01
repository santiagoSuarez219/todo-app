# test-018 — Asociar tarjeta a gastos y desglose por tarjeta en el resumen de presupuesto

## Casos de prueba

### TC-001 — Crear gasto sin tarjeta asociada
**Precondición:** La BD está levantada. Hay al menos una tarjeta registrada en `/finances/credit-cards`.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Crear un nuevo gasto con descripción "Mercado", monto 100.000, fecha hoy, tipo "Básico", sin tarjeta (dejar vacío).
**Resultado esperado:** El gasto se crea correctamente. En la lista, el badge de tarjeta NO aparece (solo tipo y monto).
**Estado:** ✅ Aprobado

---

### TC-002 — Crear gasto con tarjeta asociada
**Precondición:** La BD está levantada. Hay al menos una tarjeta registrada.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Crear un nuevo gasto con descripción "Netflix", monto 50.000, fecha hoy, tipo "Lujo", seleccionar una tarjeta del dropdown.
**Resultado esperado:** El gasto se crea correctamente. En la lista, aparece el badge con el nombre de la tarjeta junto al badge del tipo.
**Estado:** ✅ Aprobado

---

### TC-003 — Editar gasto sin tarjeta y agregarle una
**Precondición:** Existe un gasto sin tarjeta en la lista.
**Pasos:**
1. En la lista de gastos, hacer clic en el botón "Editar" del gasto.
2. Se abre el formulario. Seleccionar una tarjeta del dropdown "Tarjeta (opcional)".
3. Guardar.
**Resultado esperado:** El gasto se actualiza. El badge de tarjeta ahora aparece en la card del gasto.
**Estado:** ✅ Aprobado

---

### TC-004 — Editar gasto con tarjeta y quitarle la tarjeta
**Precondición:** Existe un gasto con tarjeta asociada.
**Pasos:**
1. Hacer clic en "Editar" del gasto.
2. En el dropdown "Tarjeta (opcional)", seleccionar "Sin tarjeta".
3. Guardar.
**Resultado esperado:** El gasto se actualiza. El badge de tarjeta desaparece de la card.
**Estado:** ✅ Aprobado

---

### TC-005 — Desglose por tarjeta en resumen de presupuesto
**Precondición:** 
- Existe un presupuesto para el mes/año actual.
- Hay al menos dos tarjetas registradas.
- Hay al menos un gasto en cada tarjeta en el mes actual.
**Pasos:**
1. Navegar a `/finances/budgets` y abrir el presupuesto actual.
2. Desplazarse hacia abajo para ver la sección "Gastos del mes" y luego "Total por tarjeta".
**Resultado esperado:** 
- La sección "Total por tarjeta" aparece debajo de "Gastos del mes".
- Se listan las tarjetas usadas en el mes con el total de gastos en cada una.
- Los totales son correctos (suma de todos los gastos con esa tarjeta en el mes).
- Si hay ingresos del mes, se muestra el porcentaje de cada total de tarjeta respecto al ingreso.
**Estado:** ✅ Aprobado

---

### TC-006 — Desglose por tarjeta no aparece sin gastos con tarjeta
**Precondición:** Existe un presupuesto con gastos, pero NINGUNO tiene tarjeta asociada.
**Pasos:**
1. Abrir el presupuesto.
2. Desplazarse hacia abajo para ver si existe la sección "Total por tarjeta".
**Resultado esperado:** La sección "Total por tarjeta" NO aparece (se oculta cuando no hay datos).
**Estado:** ✅ Aprobado

---

### TC-007 — Desglose por tarjeta se actualiza al crear gasto nuevo
**Precondición:** El presupuesto está abierto. Hay una tarjeta registrada.
**Pasos:**
1. Sin cerrar el presupuesto, navegar a `/finances/expenses` en otra pestaña o ventana.
2. Crear un gasto nuevo con esa tarjeta.
3. Volver a la pestaña del presupuesto.
4. Actualizar la página (F5).
5. Desplazarse hasta "Total por tarjeta" y verificar que el total se actualizó.
**Resultado esperado:** El nuevo gasto aparece en el desglose por tarjeta con el total correcto.
**Estado:** ✅ Aprobado

---

### TC-008 — Filtrar gastos por tarjeta
**Precondición:** Hay al menos dos tarjetas con gastos diferentes en `/finances/expenses`.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. Verificar que se ve un select o filtro de "Tarjeta" (opcional: si está implementado en esta fase).
3. Seleccionar una tarjeta.
**Resultado esperado:** La lista se filtra mostrando solo los gastos de esa tarjeta.
**Estado:** ➖ N/A — spec-018 excluye explícitamente esta UI ("No incluye: vista o filtro dedicado de gastos por tarjeta fuera del resumen de presupuesto"). Solo existe el filtro `creditCardId` a nivel de API (`GET /finances/expenses`), sin `<select>` en `ExpensesView`. Si se quiere, es un spec aparte.

---

### TC-009 — Eliminar tarjeta no elimina gastos asociados
**Precondición:** Hay una tarjeta con gastos asociados. La sección "Total por tarjeta" muestra esa tarjeta con un total.
**Pasos:**
1. Navegar a `/finances/credit-cards`.
2. Eliminar la tarjeta que tiene gastos.
3. Volver a `/finances/expenses` y verificar que los gastos siguen ahí.
4. Volver al presupuesto y verificar que la sección "Total por tarjeta" ya no lista esa tarjeta (porque los gastos ahora tienen `creditCard = null`).
**Resultado esperado:** 
- Los gastos no se eliminas.
- Los gastos quedan sin tarjeta asociada (`creditCard = null` en la BD).
- La sección de total por tarjeta no lista la tarjeta eliminada.
**Estado:** ✅ Aprobado
