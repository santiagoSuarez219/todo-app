# test-023 — Duplicar un gasto individual a otro mes

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Tarjeta "Visa" (Bancolombia) | `POST /finances/credit-cards` | `5b2e1ef0-78cb-4557-b1ad-e3685fbf3dbb` | TC-002, TC-011, TC-MCP-003 | ✅ |
| Gasto "Transporte" COP 5.000, sin tarjeta, 2026-06-15 | `POST /finances/expenses` | `fee8afca-601d-4a64-b706-88bc35c4c6f4` | TC-001, TC-007, TC-009, TC-010, TC-012 | ✅ |
| Gasto "Netflix" COP 54.900, tarjeta Visa, 2026-06-01 | `POST /finances/expenses` | `7add6a7b-6f0c-414f-9580-fb574081ea78` | TC-002, TC-011, TC-MCP-003 | ✅ |
| Gasto "Arriendo" COP 1.500.000, sin tarjeta, 2026-07-31 | `POST /finances/expenses` | `557d5c96-d3a6-4d9a-86c2-39c3add7353e` | TC-003 | ✅ |
| Gasto "Suscripcion anual" COP 20.000, sin tarjeta, 2024-01-31 (bisiesto) | `POST /finances/expenses` | `d834bb95-d2d1-4f81-a17f-994ce476ce69` | TC-004 | ✅ |
| Gasto "Suscripcion anual" COP 20.000, sin tarjeta, 2025-01-31 (no bisiesto) | `POST /finances/expenses` | `99cdcc88-e0d5-49bf-81b8-3e64c6f77d2c` | TC-005 | ✅ |
| Gasto "Regalo fin de ano" COP 30.000, sin tarjeta, 2026-12-20 | `POST /finances/expenses` | `8853d249-71d9-474c-97a5-9c258caff4d1` | TC-006 | ✅ |
| Gasto "Cafe" COP 8.000, sin tarjeta, 2026-06-15 | `POST /finances/expenses` | `32921887-f847-4427-b4d1-2f7b42b7082c` | TC-MCP-001 | ✅ |

**Notas de uso:**
- **TC-008** (manejo de error): no requiere dato propio — usar el gasto de TC-001
  (`fee8afca-…`) y provocar el error apagando el backend momentáneamente, o
  editar temporalmente el `expenseId` en las DevTools de red antes de enviar.
  Avisar antes de hacerlo para no interrumpir el resto de la ronda.
- **TC-MCP-002** (origen inexistente): usar cualquier UUID inválido, ej.
  `00000000-0000-0000-0000-000000000000`; no requiere dato propio.
- **TC-MCP-003**: reutiliza el gasto "Netflix" (`7add6a7b-…`) de TC-002 en vez
  de crear un registro nuevo — mismo propósito (tarjeta preservada), sin
  duplicar datos.

**Entorno de pruebas:** desarrollo (`http://localhost:3000/api/v1`, backend
levantado localmente para esta ronda)
**Fecha de la ronda:** 2026-08-13

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — funcionó correctamente.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — badge "Visa" preservado correctamente.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — clamp correcto.

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
**Estado:** ✅ Aprobado
**Hallazgos:** El usuario confirmó el caso como aprobado en la UI. Nota de Claude: al verificar por API (`GET /finances/expenses?year=2024&month=2`) antes de la limpieza, no se encontró ningún gasto duplicado en febrero 2024 — solo el original de enero. Se le señaló la discrepancia al usuario, quien indicó continuar sin volver a revisar. Recomendado re-verificar este caso antes de mergear el spec a `development`.

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
**Estado:** ✅ Aprobado
**Hallazgos:** El usuario confirmó el caso como aprobado en la UI. Nota de Claude: al verificar por API (`GET /finances/expenses?year=2025&month=2`) antes de la limpieza, no se encontró ningún gasto duplicado en febrero 2025 — solo el original de enero. Se le señaló la discrepancia al usuario, quien indicó continuar sin volver a revisar. Recomendado re-verificar este caso antes de mergear el spec a `development`.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — rollover diciembre→enero y año 2027 correctos.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — mensaje y auto-cierre funcionando.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — error mostrado correctamente, modal permaneció abierto. Precondición: se forzó el 404 borrando el gasto origen ("Senuelo TC-008", `a5a00fb3-5830-4222-aa5c-5ea57a2dc5aa`) por API mientras el modal ya estaba abierto.

---

### TC-009 — Cancelar la duplicación
**Precondición:** Modal de duplicar abierto con valores prellenados.

**Pasos:**
1. Hacer clic en "Duplicar" sobre un gasto.
2. Sin cambios, hacer clic en el botón "Cancelar".
3. El modal se cierra sin enviar nada.
4. La lista de gastos se mantiene sin cambios.

**Resultado esperado:** ✅ Modal cerrado sin efecto.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — modal cerrado sin efecto en la lista.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — mes/año personalizados funcionaron correctamente.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — resumen y badge de tarjeta visibles.

---

### TC-012 — Validación: campos requeridos
**Precondición:** Modal de duplicar abierto.

**Pasos:**
1. El mes tiene un default. El año tiene un default. Ambos son requeridos.
2. Intentar borrar los valores es difícil (select/number input), pero si es posible, verificar que el botón "Duplicar" se deshabilita.
3. Si se pueden dejar en blanco, al hacer clic en "Duplicar", verificar que el servidor responde con error de validación.

**Resultado esperado:** ✅ Validación funciona en frontend o backend (o ambos).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — mes/año siempre tienen valor por defecto válido.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado sobre el gasto real "Cafe" (`32921887-f847-4427-b4d1-2f7b42b7082c`, sin tarjeta) contra `/mcp` local, simulando la llamada vía HTTP crudo (JSON-RPC) porque el conector nativo `mcp__to-do-api__*` de esta sesión apunta a producción, donde `duplicate_expense` aún no está desplegado. Resultado: gasto duplicado con `date: "2026-07-15"`, `description: "Cafe"`, `amount: 8000.00`, `creditCard: null` — correcto. No se validó el paso de confirmación conversacional (no aplica al modo de invocación usado).

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado con `expenseId: "00000000-0000-0000-0000-000000000000"` contra `/mcp` local (misma vía HTTP crudo que TC-MCP-001). La tool respondió `Error: Expense 00000000-0000-0000-0000-000000000000 not found` como resultado de la tool (no como error a nivel JSON-RPC), consistente con el patrón `ok()/err()` de `mcp.service.ts`.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado sobre "Netflix" (`7add6a7b-6f0c-414f-9580-fb574081ea78`, tarjeta Visa) contra `/mcp` local, duplicado a agosto 2026 para no pisar el duplicado de TC-002 en julio. Resultado: `date: "2026-08-01"`, `creditCard.id` idéntico a la tarjeta Visa original (`5b2e1ef0-…`) — tarjeta preservada correctamente.

## Resumen de la ronda

- Aprobados: 15 — Fallidos: 0 — Pendientes: 0
- Hallazgos escalados a `spec/backlog.md`: ninguno. Se registró una
  **discrepancia sin resolver** en TC-004 y TC-005 (ver sus secciones de
  Hallazgos): el usuario confirmó ambos casos como aprobados en la UI, pero
  la verificación por API antes de la limpieza no encontró los gastos
  duplicados esperados en febrero 2024 / febrero 2025. No se investigó más a
  pedido explícito del usuario. **Recomendado re-verificar antes de marcar
  el spec como `[DONE]`**, dado que el clamp de fecha en años bisiestos/no
  bisiestos es un criterio de aceptación central del spec.
- Detalle adicional: para reconectar la conexión MCP de esta sesión hubo que
  identificar que apuntaba a producción (`https://steadfast-ambition-production.up.railway.app/mcp`,
  sin la tool `duplicate_expense` desplegada); los casos `TC-MCP-*` se
  ejecutaron simulando la llamada vía HTTP crudo contra `/mcp` local en su
  lugar (ver Hallazgos de cada caso).
- Limpieza de datos de prueba: ✅ Completada
