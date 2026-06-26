# test-013 — Sección de finanzas

## Precondiciones generales

- Backend corriendo en `http://localhost:3002`
- Frontend corriendo en `http://localhost:5173`
- Migraciones ejecutadas (`npx typeorm migration:run -d src/data-source.ts`)
- Base de datos sin datos previos de finanzas (o con datos de prueba)

---

## Navegación

### TC-001 — Sidebar muestra la sección Finanzas
**Precondición:** Aplicación cargada.
**Pasos:**
1. Observar el sidebar izquierdo.
**Resultado esperado:** Aparece la sección "FINANZAS" con 7 enlaces: Gastos, Ingresos, Compras, Cuentas, Tarjetas, CDTs, Presupuestos.
**Estado:** ⬜ Pendiente

### TC-002 — Dashboard de finanzas
**Precondición:** TC-001 aprobado.
**Pasos:**
1. Hacer clic en el icono de grid junto al título "FINANZAS" en el sidebar.
**Resultado esperado:** Se navega a `/finances` y aparece un grid con 7 cards (Gastos, Ingresos, Compras, Cuentas, Tarjetas, CDTs, Presupuestos). Cada card tiene icono, título y descripción.
**Estado:** ⬜ Pendiente

### TC-003 — Navegación desde el dashboard
**Precondición:** TC-002 aprobado.
**Pasos:**
1. Desde el dashboard de finanzas, hacer clic en cada card.
**Resultado esperado:** Cada card navega a su vista correspondiente bajo `/finances/*`.
**Estado:** ⬜ Pendiente

---

## Gastos

### TC-004 — Listar gastos (estado vacío)
**Precondición:** No hay gastos registrados.
**Pasos:**
1. Navegar a `/finances/expenses`.
**Resultado esperado:** Se muestra el título "Gastos", el botón "Nuevo gasto" y un estado vacío.
**Estado:** ⬜ Pendiente

### TC-005 — Crear gasto
**Precondición:** TC-004 aprobado.
**Pasos:**
1. Hacer clic en "Nuevo gasto".
2. Ingresar: descripción "Mercado", monto 150000, fecha de hoy, tipo "Básico".
3. Hacer clic en "Guardar".
**Resultado esperado:** El modal se cierra y aparece el gasto en la lista. El monto se muestra en COP (ej. $150.000).
**Estado:** ⬜ Pendiente

### TC-006 — Validación del formulario de gasto
**Precondición:** Modal de nuevo gasto abierto.
**Pasos:**
1. Dejar el campo descripción vacío y hacer clic en "Guardar".
**Resultado esperado:** Se muestra un error inline en el campo descripción. No se cierra el modal.
**Estado:** ⬜ Pendiente

### TC-007 — Editar gasto
**Precondición:** TC-005 aprobado.
**Pasos:**
1. Hacer clic en "Editar" en el gasto creado.
2. Cambiar el monto a 200000.
3. Guardar.
**Resultado esperado:** El gasto se actualiza con el nuevo monto.
**Estado:** ⬜ Pendiente

### TC-008 — Eliminar gasto
**Precondición:** TC-005 aprobado.
**Pasos:**
1. Hacer clic en "Eliminar" en el gasto creado.
2. Confirmar en el diálogo.
**Resultado esperado:** El gasto desaparece de la lista.
**Estado:** ⬜ Pendiente

---

## Ingresos

### TC-009 — Crear ingreso
**Precondición:** Navegar a `/finances/incomes`.
**Pasos:**
1. Hacer clic en "Nuevo ingreso".
2. Ingresar: descripción "Sueldo enero", monto 5000000, fecha de hoy, tipo "Sueldo".
3. Guardar.
**Resultado esperado:** El ingreso aparece en la lista con monto en COP.
**Estado:** ⬜ Pendiente

### TC-010 — Editar y eliminar ingreso
**Precondición:** TC-009 aprobado.
**Pasos:**
1. Editar el ingreso cambiando la descripción.
2. Guardarlo.
3. Eliminarlo con confirmación.
**Resultado esperado:** La edición se refleja y luego el registro desaparece.
**Estado:** ⬜ Pendiente

---

## Compras (Wishlist)

### TC-011 — Crear compra pendiente
**Precondición:** Navegar a `/finances/purchases`.
**Pasos:**
1. Hacer clic en "Nueva compra".
2. Ingresar: descripción "Teclado mecánico", precio estimado 350000, prioridad "Alta", tienda "Amazon", status "Pendiente".
3. Guardar.
**Resultado esperado:** La compra aparece en la lista con sus badges de prioridad, tienda y estado.
**Estado:** ⬜ Pendiente

### TC-012 — Filtrar compras por status
**Precondición:** Existen compras con distintos status.
**Pasos:**
1. Hacer clic en la pestaña "Comprado".
**Resultado esperado:** Solo aparecen compras con status "comprado". La paginación se mantiene.
**Estado:** ⬜ Pendiente

### TC-013 — Editar y eliminar compra
**Precondición:** TC-011 aprobado.
**Pasos:**
1. Editar la compra cambiando el status a "Comprado".
2. Guardarlo.
3. Eliminarlo con confirmación.
**Resultado esperado:** El status se actualiza y luego la compra desaparece.
**Estado:** ⬜ Pendiente

---

## Cuentas

### TC-014 — Crear cuenta
**Precondición:** Navegar a `/finances/accounts`.
**Pasos:**
1. Hacer clic en "Nueva cuenta".
2. Ingresar: nombre "Bancolombia Ahorros", banco "Bancolombia", tipo "Ahorros", saldo 2500000, tasa 0.0350.
3. Guardar.
**Resultado esperado:** La cuenta aparece en el grid. El saldo se muestra en COP y la tasa como "3.50% E.A.".
**Estado:** ⬜ Pendiente

### TC-015 — Editar y eliminar cuenta
**Precondición:** TC-014 aprobado.
**Pasos:**
1. Editar la cuenta actualizando el saldo.
2. Guardarlo.
3. Eliminarlo con confirmación.
**Resultado esperado:** El saldo se actualiza y luego la cuenta desaparece.
**Estado:** ⬜ Pendiente

---

## Tarjetas de crédito

### TC-016 — Crear tarjeta de crédito
**Precondición:** Navegar a `/finances/credit-cards`.
**Pasos:**
1. Hacer clic en "Nueva tarjeta".
2. Ingresar: nombre "Visa Platinum", banco "Davivienda", tasa 0.2800, cuota mensual 25000, cupo total 10000000, cupo disponible 7500000.
3. Guardar.
**Resultado esperado:** La tarjeta aparece en el grid mostrando cupo disponible vs total, tasa y cuota de manejo.
**Estado:** ⬜ Pendiente

### TC-017 — Editar y eliminar tarjeta
**Precondición:** TC-016 aprobado.
**Pasos:**
1. Editar la tarjeta actualizando el cupo disponible.
2. Guardarlo.
3. Eliminarlo con confirmación.
**Resultado esperado:** El cupo se actualiza y luego la tarjeta desaparece.
**Estado:** ⬜ Pendiente

---

## CDTs

### TC-018 — Crear CDT activo
**Precondición:** Navegar a `/finances/cdts`.
**Pasos:**
1. Hacer clic en "Nuevo CDT".
2. Ingresar: banco "Bancolombia", monto 10000000, tasa 0.1250, fecha inicio hoy, fecha vencimiento en 6 meses.
3. Guardar.
**Resultado esperado:** El CDT aparece en la sección "ACTIVOS". Se muestran banco, monto en COP, tasa y fechas.
**Estado:** ⬜ Pendiente

### TC-019 — Badge de vencimiento próximo
**Precondición:** Existe un CDT con fecha de vencimiento en los próximos 30 días.
**Pasos:**
1. Observar la tarjeta del CDT.
**Resultado esperado:** Aparece un badge amarillo indicando "Vence en X días".
**Estado:** ⬜ Pendiente

### TC-020 — Separación visual activos vs vencidos
**Precondición:** Existen CDTs activos y CDTs con fecha vencida.
**Pasos:**
1. Observar la vista de CDTs.
**Resultado esperado:** Los CDTs activos aparecen en la sección "ACTIVOS" y los vencidos en "VENCIDOS" con opacidad reducida.
**Estado:** ⬜ Pendiente

### TC-021 — Editar y eliminar CDT
**Precondición:** TC-018 aprobado.
**Pasos:**
1. Editar el CDT cambiando el monto.
2. Guardarlo.
3. Eliminarlo con confirmación.
**Resultado esperado:** El monto se actualiza y luego el CDT desaparece.
**Estado:** ⬜ Pendiente

---

## Presupuestos

### TC-022 — Crear presupuesto
**Precondición:** Navegar a `/finances/budgets`.
**Pasos:**
1. Hacer clic en "Nuevo presupuesto".
2. Ingresar: nombre "Presupuesto Enero 2025", mes "Enero", año 2025.
3. Guardar.
**Resultado esperado:** El presupuesto aparece en la lista mostrando nombre, mes/año, 0 ítems y total $0.
**Estado:** ⬜ Pendiente

### TC-023 — Filtrar presupuestos por año
**Precondición:** Existen presupuestos de distintos años.
**Pasos:**
1. Seleccionar un año diferente en el selector de filtro.
**Resultado esperado:** Solo aparecen presupuestos del año seleccionado.
**Estado:** ⬜ Pendiente

### TC-024 — Ver detalle de presupuesto
**Precondición:** TC-022 aprobado.
**Pasos:**
1. Hacer clic en la tarjeta del presupuesto.
**Resultado esperado:** Se navega al detalle. Muestra nombre, mes/año, tabla vacía de ítems y formulario inline para agregar.
**Estado:** ⬜ Pendiente

### TC-025 — Agregar ítem al presupuesto
**Precondición:** TC-024 aprobado.
**Pasos:**
1. Ingresar descripción "Arriendo" y monto 1200000 en el formulario inline.
2. Hacer clic en "Agregar".
**Resultado esperado:** El ítem aparece en la tabla. El formulario se resetea. El total planificado se actualiza a $1.200.000.
**Estado:** ⬜ Pendiente

### TC-026 — Agregar múltiples ítems y verificar total
**Precondición:** TC-025 aprobado.
**Pasos:**
1. Agregar un segundo ítem "Servicios" por 200000.
**Resultado esperado:** Ambos ítems aparecen en la tabla. El total muestra $1.400.000.
**Estado:** ⬜ Pendiente

### TC-027 — Eliminar ítem del presupuesto
**Precondición:** TC-025 aprobado.
**Pasos:**
1. Hacer clic en el ícono de eliminar junto a un ítem.
2. Confirmar en el diálogo.
**Resultado esperado:** El ítem desaparece. El total planificado se recalcula.
**Estado:** ⬜ Pendiente

### TC-028 — Editar presupuesto
**Precondición:** TC-022 aprobado.
**Pasos:**
1. Hacer clic en "Editar" en la vista de detalle.
2. Cambiar el nombre a "Presupuesto Enero 2025 v2".
3. Guardar.
**Resultado esperado:** El nombre se actualiza en la cabecera del detalle y en la lista de presupuestos.
**Estado:** ⬜ Pendiente

### TC-029 — Eliminar presupuesto
**Precondición:** TC-022 aprobado.
**Pasos:**
1. Volver a la lista de presupuestos.
2. Hacer clic en "Eliminar" en la tarjeta del presupuesto.
3. Confirmar.
**Resultado esperado:** El presupuesto y todos sus ítems desaparecen de la lista.
**Estado:** ⬜ Pendiente

---

## Criterios transversales

### TC-030 — Respuestas del backend con formato correcto
**Precondición:** Al menos un registro de cada entidad creado.
**Pasos:**
1. Abrir las DevTools del navegador (pestaña Network).
2. Cargar cualquier vista de finanzas.
**Resultado esperado:** Las respuestas tienen el formato `{ statusCode, message, data }`.
**Estado:** ⬜ Pendiente

### TC-031 — Dark mode en vistas de finanzas
**Precondición:** Aplicación cargada.
**Pasos:**
1. Activar el modo oscuro desde el sidebar.
2. Navegar por todas las vistas de finanzas.
**Resultado esperado:** Todas las vistas, formularios y cards se muestran correctamente en modo oscuro.
**Estado:** ⬜ Pendiente
