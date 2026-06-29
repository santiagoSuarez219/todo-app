# test-016 — Sección de deudas

## Precondiciones

- Backend corriendo en `http://localhost:3002`.
- Frontend corriendo en `http://localhost:5173`.
- Base de datos local con la migración `1782749715235-CreateDebts` aplicada.

---

## Casos de prueba

### TC-001 — Acceso desde el dashboard de finanzas
**Precondición:** El usuario está en `/finances`.
**Pasos:**
1. Verificar que aparece una tarjeta "Deudas" con descripción "Seguimiento de deudas y cuotas".
2. Hacer clic en la tarjeta.
**Resultado esperado:** Navega a `/finances/debts` y se muestra la vista de deudas con el header "Deudas" y el botón "Nueva deuda".
**Estado:** ⬜ Pendiente

---

### TC-002 — Crear una deuda sin cuota inicial
**Precondición:** El usuario está en `/finances/debts`.
**Pasos:**
1. Hacer clic en "Nueva deuda".
2. Completar: descripción "Nevera Samsung", valor producto "2500000", valor cuota "208333", número de cuotas "12". Dejar cuota inicial vacía.
3. Hacer clic en "Guardar".
**Resultado esperado:** El modal se cierra y aparece una card con la deuda. Muestra "0 / 12 cuotas", badge "Activa" y el botón "Pagar cuota".
**Estado:** ⬜ Pendiente

---

### TC-003 — Crear una deuda con cuota inicial
**Precondición:** El usuario está en `/finances/debts`.
**Pasos:**
1. Hacer clic en "Nueva deuda".
2. Completar: descripción "Televisor LG", valor producto "1800000", valor cuota "150000", número de cuotas "10", cuota inicial "300000".
3. Hacer clic en "Guardar".
**Resultado esperado:** La card muestra el campo "Inicial: $300.000" además de los demás datos.
**Estado:** ⬜ Pendiente

---

### TC-004 — Validación del formulario
**Precondición:** El modal de nueva deuda está abierto.
**Pasos:**
1. Hacer clic en "Guardar" sin completar ningún campo.
**Resultado esperado:** Aparecen mensajes de error en los campos requeridos (descripción, valor producto, valor cuota, número de cuotas). No se cierra el modal.
**Estado:** ⬜ Pendiente

---

### TC-005 — Pagar una cuota
**Precondición:** Existe la deuda "Nevera Samsung" con 0 / 12 cuotas pagadas.
**Pasos:**
1. Hacer clic en "Pagar cuota" en la card de "Nevera Samsung".
2. Esperar la respuesta.
**Resultado esperado:** El contador cambia a "1 / 12 cuotas" y la barra de progreso avanza. El botón "Pagar cuota" sigue visible.
**Estado:** ⬜ Pendiente

---

### TC-006 — Pagar la última cuota cierra la deuda
**Precondición:** Existe una deuda con 1 / 1 cuotas por pagar (crear una deuda de prueba con `totalInstallments: 1`).
**Pasos:**
1. Hacer clic en "Pagar cuota".
**Resultado esperado:** El badge cambia de "Activa" a "Pagada", la barra llega al 100% en verde y el botón "Pagar cuota" desaparece.
**Estado:** ⬜ Pendiente

---

### TC-007 — El pago de cuota crea un gasto
**Precondición:** Existe la deuda "Nevera Samsung" con cuotas activas.
**Pasos:**
1. Anotar la cantidad de gastos en `/finances/expenses`.
2. Volver a `/finances/debts` y pagar una cuota de "Nevera Samsung".
3. Ir a `/finances/expenses`.
**Resultado esperado:** Aparece un nuevo gasto con descripción "Cuota: Nevera Samsung", monto igual al valor de la cuota, tipo `pago_deuda` y fecha de hoy.
**Estado:** ⬜ Pendiente

---

### TC-008 — Filtro "Activas"
**Precondición:** Existen al menos una deuda activa y una pagada.
**Pasos:**
1. Hacer clic en el tab "Activas".
**Resultado esperado:** Solo se muestran deudas con badge "Activa". Las deudas pagadas no aparecen.
**Estado:** ⬜ Pendiente

---

### TC-009 — Filtro "Pagadas"
**Precondición:** Existen al menos una deuda activa y una pagada.
**Pasos:**
1. Hacer clic en el tab "Pagadas".
**Resultado esperado:** Solo se muestran deudas con badge "Pagada". Las deudas activas no aparecen.
**Estado:** ⬜ Pendiente

---

### TC-010 — Editar una deuda
**Precondición:** Existe la deuda "Nevera Samsung".
**Pasos:**
1. Hacer clic en el ícono de lápiz de la card.
2. Cambiar la descripción a "Nevera Samsung 2024".
3. Hacer clic en "Guardar".
**Resultado esperado:** El modal se cierra y la card muestra el nuevo nombre "Nevera Samsung 2024".
**Estado:** ⬜ Pendiente

---

### TC-011 — Eliminar una deuda
**Precondición:** Existe al menos una deuda.
**Pasos:**
1. Hacer clic en el ícono de papelera de cualquier deuda.
2. Confirmar en el diálogo de confirmación.
**Resultado esperado:** La deuda desaparece de la lista.
**Estado:** ⬜ Pendiente

---

### TC-012 — Estado vacío
**Precondición:** No existen deudas (o se han eliminado todas).
**Pasos:**
1. Navegar a `/finances/debts`.
**Resultado esperado:** Se muestra el mensaje "No hay deudas registradas." sin errores.
**Estado:** ⬜ Pendiente
