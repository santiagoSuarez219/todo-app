# test-019 — Edición inline de gastos

## Casos de prueba

### TC-001 — Editar descripción de un gasto inline
**Precondición:** Hay al menos un gasto en la lista de gastos.
**Pasos:**
1. Navegar a `/finances/expenses`.
2. En un gasto, hacer clic en el botón "Editar".
3. La card se transforma mostrando un input de descripción (autoFocus), más campos de monto/fecha/tipo/tarjeta abajo.
4. Cambiar el texto de la descripción en el input.
5. Hacer clic en el botón ✓ (guardar).
**Resultado esperado:** 
- El gasto se actualiza y la card vuelve a modo lectura con la nueva descripción.
- No abre modal.
- PATCH al backend incluye solo `description` (diffing).
**Estado:** ✅ Aprobado

---

### TC-002 — Cancelar edición sin cambios
**Precondición:** Hay un gasto en la lista.
**Pasos:**
1. Hacer clic en "Editar" de un gasto.
2. La card entra en modo edición.
3. Cambiar algunos valores en los inputs.
4. Hacer clic en el botón ✗ (cancelar).
**Resultado esperado:** 
- La card vuelve a modo lectura con los datos originales (sin cambios).
- Los cambios no se persistieron.
**Estado:** ✅ Aprobado

---

### TC-003 — Botón guardar deshabilitado con campos vacíos
**Precondición:** Hay un gasto en la lista.
**Pasos:**
1. Hacer clic en "Editar".
2. Borrar completamente la descripción (dejar en blanco).
3. Intentar hacer clic en el botón ✓.
**Resultado esperado:** El botón ✓ está deshabilitado (`opacity-40`) y no responde al clic.
**Estado:** ✅ Aprobado

---

### TC-004 — Botón guardar deshabilitado con monto inválido
**Precondición:** Hay un gasto en la lista.
**Pasos:**
1. Hacer clic en "Editar".
2. Cambiar el monto a "0" o a un número negativo.
3. Intentar hacer clic en el botón ✓.
**Resultado esperado:** El botón ✓ está deshabilitado.
**Estado:** ✅ Aprobado

---

### TC-005 — Editar todos los campos (descripción, monto, fecha, tipo, tarjeta)
**Precondición:** Hay un gasto sin tarjeta. Hay al menos una tarjeta registrada.
**Pasos:**
1. Hacer clic en "Editar" del gasto.
2. Cambiar descripción a "Netflix Premium".
3. Cambiar monto a "80000".
4. Cambiar fecha a otra fecha.
5. Cambiar tipo a "Lujo".
6. Seleccionar una tarjeta del dropdown.
7. Hacer clic en ✓.
**Resultado esperado:** 
- El gasto se actualiza con todos los cambios.
- La card vuelve a modo lectura y muestra todos los campos actualizados.
- El badge de tarjeta ahora aparece.
**Estado:** ✅ Aprobado

---

### TC-006 — Quitar tarjeta de un gasto
**Precondición:** Hay un gasto con tarjeta asociada.
**Pasos:**
1. Hacer clic en "Editar".
2. En el select de tarjeta, seleccionar "Sin tarjeta".
3. Hacer clic en ✓.
**Resultado esperado:** 
- El gasto se actualiza.
- La card vuelve a modo lectura sin el badge de tarjeta.
**Estado:** ✅ Aprobado

---

### TC-007 — Solo una card en edición a la vez
**Precondición:** Hay al menos 2 gastos en la lista.
**Pasos:**
1. Hacer clic en "Editar" del gasto #1 (entra en edición).
2. Intentar hacer clic en "Editar" del gasto #2.
**Resultado esperado:** 
- El botón "Editar" del gasto #2 está deshabilitado (`opacity-30`).
- No es posible abrir edición en otra card mientras la #1 está en edición.
- El botón "Eliminar" de #2 también está deshabilitado.
**Estado:** ✅ Aprobado

---

### TC-008 — Validación en tiempo real del formulario inline
**Precondición:** Hay un gasto en edición (TC-001 a TC-006 al iniciar edición).
**Pasos:**
1. En el modo edición, escribir en el input de descripción y borrar (dejar vacío).
2. Inmediatamente, el botón ✓ cambia a deshabilitado.
3. Escribir algo en la descripción nuevamente.
4. El botón ✓ vuelve a estar habilitado.
**Resultado esperado:** El botón ✓ responde dinámicamente al cambiar campos sin esperar a un submit.
**Estado:** ✅ Aprobado

---

### TC-009 — Botón "Nuevo gasto" sigue abriendo modal
**Precondición:** Hay gastos en la lista.
**Pasos:**
1. Estar en `/finances/expenses`.
2. Hacer clic en "Nuevo gasto".
**Resultado esperado:** 
- Se abre un modal con el título "Nuevo gasto".
- Contiene `ExpenseForm` (igual que antes).
- Es independiente de la edición inline.
**Estado:** ✅ Aprobado

---

### TC-010 — Grid responsive en modo edición
**Precondición:** Hay un gasto en edición (en modo mobile/narrow viewport).
**Pasos:**
1. En `/finances/expenses` con una pantalla estrecha (mobile, <640px).
2. Hacer clic en "Editar" de un gasto.
3. La card muestra la descripción a ancho completo arriba.
4. Los 4 campos (monto/fecha/tipo/tarjeta) se apilan en 2 columnas (`grid-cols-2`).
5. Cambiar viewport a desktop (>640px).
6. Los 4 campos ahora se apilan en 4 columnas (`sm:grid-cols-4`).
**Resultado esperado:** El layout se adapta responsivamente sin overflow horizontal.
**Estado:** ✅ Aprobado

---

### TC-011 — Edición inline se cierra al navegar
**Precondición:** Un gasto está en modo edición.
**Pasos:**
1. Hacer clic en "Editar" de un gasto.
2. La card está en modo edición.
3. Cambiar el filtro de mes/año (los selects en el header).
**Resultado esperado:** 
- La lista se actualiza con gastos del nuevo mes.
- La edición inline se cancela automáticamente.
- Todas las cards vuelven a modo lectura.
**Estado:** ✅ Aprobado
