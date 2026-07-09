# test-023 — Duplicar un gasto individual a otro mes

## Casos de prueba (Frontend)

### TC-001 — Duplicar gasto sin tarjeta de crédito
**Precondición:** Existen gastos en junio 2026 sin tarjeta asociada (ej. "Transporte COP 5.000", fecha 2026-06-15).

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por junio 2026.
2. En el card del gasto, hacer clic en el botón "Duplicar".
3. Se abre el modal "Duplicar gasto". Verificar que el formulario muestra:
   - Select de mes prefijado en julio (mes siguiente a junio)
   - Input de año prefijado en 2026
   - Resumen: "Se copiará: Transporte por COP 5.000"
4. Sin cambios, hacer clic en "Duplicar".
5. El modal muestra "✓ Gasto duplicado a Julio 2026".
6. El modal se cierra automáticamente tras 2 segundos.
7. La lista de gastos se recarga y ahora muestra el mismo gasto en julio con fecha 2026-07-15.

**Resultado esperado:** ✅ Gasto duplicado exitosamente, sin tarjeta de crédito.

---

### TC-002 — Duplicar gasto con tarjeta de crédito
**Precondición:** Existen gastos en junio 2026 con tarjeta asociada (ej. "Netflix", COP 54.900, tarjeta "Visa", fecha 2026-06-01).

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por junio 2026.
2. Buscar el gasto con tarjeta ("Netflix") y hacer clic en "Duplicar".
3. Se abre el modal, el formulario muestra mes=julio, año=2026.
4. Sin cambios, hacer clic en "Duplicar".
5. Esperar el mensaje de éxito y la recarga automática.
6. En la lista, filtrar por julio 2026 y localizar el gasto duplicado.
7. Verificar que el gasto duplicado muestra el badge "Visa" (la tarjeta se preservó).

**Resultado esperado:** ✅ Gasto duplicado con tarjeta de crédito preservada.

---

### TC-003 — Clamp de fecha: día 31 → mes de 30 días
**Precondición:** Existe un gasto en julio 2026 con fecha 2026-07-31 (ej. "Arriendo", COP 1.500.000).

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por julio 2026.
2. En el gasto del día 31, hacer clic en "Duplicar".
3. En el modal, cambiar el mes a **Junio** (que tiene 30 días) y el año a 2026.
4. Hacer clic en "Duplicar".
5. Esperar el éxito y recargar.
6. Filtrar por junio 2026 y buscar el gasto duplicado.
7. Verificar que la fecha es 2026-06-30 (clampeada al último día de junio, no 31).

**Resultado esperado:** ✅ Día clampeado de 31 → 30; fecha correcta 2026-06-30.

---

### TC-004 — Clamp de fecha: día 31 enero → febrero (año bisiesto)
**Precondición:** Existe un gasto en enero 2024 (bisiesto) con fecha 2024-01-31.

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por enero 2024.
2. En el gasto del día 31, hacer clic en "Duplicar".
3. En el modal, cambiar el mes a **Febrero** y el año a 2024 (bisiesto).
4. Hacer clic en "Duplicar".
5. Esperar éxito y recargar.
6. Filtrar por febrero 2024 y verificar que la fecha duplicada es 2024-02-29 (último día bisiesto, no 31).

**Resultado esperado:** ✅ Clamp bisiesto correcto: 31 enero → 29 febrero 2024.

---

### TC-005 — Clamp de fecha: día 31 enero → febrero (año no bisiesto)
**Precondición:** Existe un gasto en enero 2025 con fecha 2025-01-31.

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por enero 2025.
2. En el gasto del día 31, hacer clic en "Duplicar".
3. En el modal, cambiar el mes a **Febrero** y el año a 2025 (no bisiesto).
4. Hacer clic en "Duplicar".
5. Esperar éxito y recargar.
6. Filtrar por febrero 2025 y verificar que la fecha duplicada es 2025-02-28 (último día, no 29 ni 31).

**Resultado esperado:** ✅ Clamp no-bisiesto correcto: 31 enero → 28 febrero 2025.

---

### TC-006 — Prellenado del formulario: mes siguiente con rollover diciembre
**Precondición:** Existe un gasto en diciembre 2026.

**Pasos:**
1. Navegar a `/finances/expenses`, filtrar por diciembre 2026.
2. Hacer clic en "Duplicar" sobre un gasto cualquiera.
3. Verificar que el modal muestra:
   - Select de mes prefijado en **Enero** (rol over de diciembre → enero)
   - Input de año prefijado en **2027** (año incrementado al cruzar el año)

**Resultado esperado:** ✅ Prellenado correcto con rollover de año.

---

### TC-007 — Feedback de éxito: mensaje y auto-cierre
**Precondición:** Un gasto existe para duplicar.

**Pasos:**
1. Hacer clic en "Duplicar" sobre un gasto.
2. Sin cambios, hacer clic en "Duplicar" (dentro del modal).
3. Verificar que aparece un mensaje verde: "✓ Gasto duplicado a [mes] [año]".
4. El mensaje permanece visible durante ~2 segundos.
5. El modal se cierra automáticamente y vuelve a la lista de gastos.

**Resultado esperado:** ✅ Feedback visible y auto-cierre funcionando.

---

### TC-008 — Manejo de error: descripción clara sin cierre del modal
**Precondición:** Preparar un escenario que cause error (ej. intentar duplicar a un mes/año con un UUID de gasto inválido si se puede manipular, o forzar una condición de error en el backend).

**Pasos:**
1. Abrir el modal de duplicar.
2. Simular un error (ej. el backend responde con 404 o 500).
3. Verificar que aparece un mensaje rojo con el error: "✗ [mensaje del error]".
4. El modal **no se cierra**; el formulario sigue visible.
5. El usuario puede leer el error y decidir si intentar nuevamente o cancelar.

**Resultado esperado:** ✅ Error mostrado sin cerrar modal; usuario puede reintentar o cancelar.

---

### TC-009 — Cancelar la duplicación
**Precondición:** Modal de duplicar abierto con valores prellenados.

**Pasos:**
1. Hacer clic en "Duplicar" sobre un gasto.
2. Sin cambios, hacer clic en el botón "Cancelar".
3. El modal se cierra sin enviar nada.
4. La lista de gastos se mantiene sin cambios.

**Resultado esperado:** ✅ Modal cerrado sin efecto.

---

### TC-010 — Cambio de mes y año en el formulario
**Precondición:** Modal de duplicar abierto.

**Pasos:**
1. El mes está prefijado al siguiente. Cambiar el select a un mes diferente (ej. +2 meses).
2. El año está prefijado al actual. Cambiar el input a un año diferente (ej. 2027).
3. Hacer clic en "Duplicar".
4. Esperar éxito, recargar.
5. Filtrar por el mes/año seleccionados y verificar que el gasto aparece con la nueva fecha.

**Resultado esperado:** ✅ Mes y año personalizados funcionan correctamente.

---

### TC-011 — Resumen en el modal (presupuesto y tarjeta)
**Precondición:** Modal abierto para duplicar un gasto.

**Pasos:**
1. Verificar que el modal muestra un bloque azul (info) con el resumen:
   - "Se copiará: [descripción del gasto]"
   - "por [monto en formato COP]"
2. Si el gasto tiene tarjeta, verificar que el badge de la tarjeta es visible en la lista de gastos originales.
3. La tarjeta se preserva (verificar en TC-002).

**Resultado esperado:** ✅ Resumen visible y tarjeta preservada.

---

### TC-012 — Validación: campos requeridos
**Precondición:** Modal de duplicar abierto.

**Pasos:**
1. El mes tiene un default. El año tiene un default. Ambos son requeridos.
2. Intentar borrar los valores es difícil (select/number input), pero si es posible, verificar que el botón "Duplicar" se deshabilita.
3. Si se pueden dejar en blanco, al hacer clic en "Duplicar", verificar que el servidor responde con error de validación.

**Resultado esperado:** ✅ Validación funciona en frontend o backend (o ambos).

---

## Casos de prueba (MCP)

### TC-MCP-001 — Duplicar gasto vía tool MCP (caso feliz)
**Precondición:** Un gasto existe (ej. UUID `abc-123`, descripción "Café", COP 8.000, fecha 2026-06-15, sin tarjeta).

**Tool:** `duplicate_expense`

**Input:**
```json
{
  "expenseId": "abc-123",
  "month": 7,
  "year": 2026
}
```

**Comportamiento esperado:**
1. El agente confirma con el usuario antes de invocar: "Voy a duplicar el gasto 'Café' del 15 de junio 2026 al 15 de julio 2026. ¿Procedo?"
2. Tras confirmación, invoca la tool.
3. La tool devuelve el gasto duplicado con la fecha 2026-07-15, descripción "Café", monto 8.000.
4. El agente informa: "✓ Gasto duplicado exitosamente a julio 2026."

**Resultado esperado:** ✅ Tool responde correctamente, agente confirma antes.

---

### TC-MCP-002 — Duplicar gasto no existente (error 404)
**Tool:** `duplicate_expense`

**Input:**
```json
{
  "expenseId": "invalid-uuid-12345",
  "month": 7,
  "year": 2026
}
```

**Comportamiento esperado:**
1. La tool devuelve error 404: "Expense invalid-uuid-12345 not found".
2. El agente captura el error y informa: "✗ No encontré el gasto con ese ID. ¿Podrías verificar el UUID?"

**Resultado esperado:** ✅ Error manejado correctamente.

---

### TC-MCP-003 — Duplicar gasto con tarjeta (MCP)
**Precondición:** Un gasto existe con tarjeta asociada (ej. UUID `xyz-789`, "Netflix", COP 54.900, tarjeta "Visa", fecha 2026-06-01).

**Tool:** `duplicate_expense`

**Input:**
```json
{
  "expenseId": "xyz-789",
  "month": 7,
  "year": 2026
}
```

**Comportamiento esperado:**
1. El agente confirma: "Voy a duplicar el gasto 'Netflix' (tarjeta Visa) del 1 de junio 2026 al 1 de julio 2026. ¿Procedo?"
2. Tras confirmación, invoca la tool.
3. La tool devuelve el gasto duplicado con creditCard.name = "Visa" intacto.
4. El agente informa: "✓ Gasto duplicado con tarjeta Visa preservada."

**Resultado esperado:** ✅ Tarjeta copiada en respuesta MCP.
