# test-020 — Duplicar mes financiero de un presupuesto a otro mes

> Casos manuales de UI para el spec-020. Los endpoints REST y la tool MCP se
> validan además con pruebas e2e (ejecutadas por `@tester` de backend como
> última fase, tras la aprobación de estos casos manuales).

## Precondiciones generales

- La base de datos está levantada (`docker compose up -d`) y el backend corre
  en `http://localhost:3002` (`npm run start:dev` en `backend/`).
- El frontend corre (`npm run dev` en `frontend/`) y se usa en **desktop**
  (la sección de finanzas está oculta en móvil).
- Existe al menos una tarjeta de crédito registrada en `/finances/credit-cards`.
- Existe un **presupuesto origen** (ej. "Presupuesto junio 2026", mes 6, año
  2026) con:
  - Al menos 3 ítems de distinto tipo (ej. arriendo `basico`, streaming `lujo`,
    fondo `ahorro`).
  - Al menos 2 ingresos en junio 2026 (uno el día 15, otro el **día 31** de un
    mes que sí tenga 31 días para probar el clamp — usar mayo o julio como
    origen si se quiere probar el borde; ver TC-007).
  - Al menos 3 gastos en junio 2026, **uno de ellos con tarjeta asociada**.

---

## Casos de prueba

### TC-001 — Duplicar desde la card en la lista de presupuestos
**Precondición:** Existe el presupuesto origen. El mes/año destino (ej. julio
2026) **no** tiene presupuesto.
**Pasos:**
1. Navegar a `/finances/budgets`.
2. En la card del presupuesto origen, hacer clic en el botón de **duplicar**
   (ícono de copia, a la izquierda de "Eliminar"; tooltip "Duplicar a otro mes").
3. Se abre el modal "Duplicar presupuesto". Dejar los valores por defecto.
4. Hacer clic en "Duplicar mes".
**Resultado esperado:**
- El modal cambia a "Presupuesto duplicado" con un bloque verde de éxito.
- Se muestran los tres contadores: ítems copiados, ingresos recreados y gastos
  recreados, con números correctos según el origen.
- Aparecen los botones "Ver presupuesto" y "Cerrar".
**Estado:** ⬜ Pendiente

---

### TC-002 — Valores por defecto del formulario (mes/año siguiente)
**Precondición:** Presupuesto origen de junio 2026 (mes 6).
**Pasos:**
1. Abrir el modal de duplicar desde la card del origen.
2. Observar los campos "Mes destino", "Año destino" y "Nombre (opcional)".
**Resultado esperado:**
- "Mes destino" = **Julio** (mes siguiente al origen).
- "Año destino" = **2026** (mismo año).
- "Nombre (opcional)" vacío, con placeholder que muestra el nombre del origen.
- El bloque informativo indica cuántos ítems se copiarán ("Se copiarán: N
  ítems, todos los ingresos y gastos del mes").
**Estado:** ⬜ Pendiente

---

### TC-003 — Default de fin de año (diciembre → enero del año siguiente)
**Precondición:** Existe un presupuesto origen de **diciembre 2026** (mes 12).
**Pasos:**
1. Abrir el modal de duplicar desde ese presupuesto.
2. Observar los defaults de mes y año.
**Resultado esperado:**
- "Mes destino" = **Enero**.
- "Año destino" = **2027** (año siguiente).
**Estado:** ⬜ Pendiente

---

### TC-004 — Duplicar con nombre personalizado
**Precondición:** Mes/año destino libre.
**Pasos:**
1. Abrir el modal de duplicar.
2. Escribir un nombre en "Nombre (opcional)", ej. "Presupuesto julio 2026 (copia)".
3. Elegir un mes/año destino libre y hacer clic en "Duplicar mes".
4. Tras el éxito, hacer clic en "Ver presupuesto".
**Resultado esperado:**
- El presupuesto destino se crea con el nombre personalizado escrito.
- Si el campo se deja vacío, el destino reutiliza el nombre del origen.
**Estado:** ⬜ Pendiente

---

### TC-005 — Duplicar desde el detalle del presupuesto
**Precondición:** Mes/año destino libre.
**Pasos:**
1. Navegar a `/finances/budgets` y abrir el presupuesto origen (clic en la card).
2. En la barra de acciones del encabezado, hacer clic en "Duplicar" (junto a
   "Editar").
3. Completar el formulario con un mes/año destino libre y confirmar.
**Resultado esperado:**
- Se abre el mismo formulario de duplicación y funciona igual que desde la lista.
- Al terminar, se muestra el panel de éxito con los tres contadores.
**Estado:** ⬜ Pendiente

---

### TC-006 — Botón "Ver presupuesto" navega al destino creado
**Precondición:** Se acaba de completar una duplicación con éxito (panel visible).
**Pasos:**
1. En el panel "Presupuesto duplicado", hacer clic en "Ver presupuesto".
**Resultado esperado:**
- La app navega a `/finances/budgets/{id-del-nuevo-presupuesto}`.
- El detalle muestra el presupuesto destino con sus ítems copiados y el mes/año
  destino en el encabezado.
**Estado:** ⬜ Pendiente

---

### TC-007 — Desplazamiento de fechas con clamp al último día del mes
**Precondición:** El presupuesto origen tiene ingresos y/o gastos con día 31
(ej. un mes origen con 31 días: mayo, julio, agosto…). El mes destino tiene
menos días (ej. destino = febrero, o abril/junio de 30 días).
**Pasos:**
1. Duplicar el presupuesto origen hacia un mes destino más corto (ej. de
   julio-31 hacia febrero).
2. Navegar a `/finances/expenses` e `/finances/incomes` y filtrar por el mes
   destino.
**Resultado esperado:**
- Cada gasto/ingreso copiado conserva el mismo día del mes que el original…
- …salvo los que caían en un día inexistente en el destino, que se recortan al
  **último día del mes destino** (ej. día 31 → 28 en febrero no bisiesto, 29 en
  bisiesto; día 31 → 30 en un mes de 30 días).
- No hay desfase de un día por zona horaria (el día mostrado es el esperado).
**Estado:** ⬜ Pendiente

---

### TC-008 — Preservación de la tarjeta en los gastos copiados
**Precondición:** El presupuesto origen tiene al menos un gasto con tarjeta
asociada.
**Pasos:**
1. Duplicar el presupuesto origen a un mes destino libre.
2. Ir a `/finances/expenses`, filtrar por el mes destino y localizar el gasto
   copiado que en el origen tenía tarjeta.
**Resultado esperado:**
- El gasto copiado muestra el **badge de la misma tarjeta** que el original.
- Los gastos sin tarjeta en el origen siguen sin tarjeta en el destino.
- (Verificación adicional) Al abrir el presupuesto destino, la sección "Total
  por tarjeta" refleja el gasto copiado con tarjeta.
**Estado:** ⬜ Pendiente

---

### TC-009 — El botón duplicar no navega al detalle (stopPropagation)
**Precondición:** Estás en `/finances/budgets` con al menos un presupuesto.
**Pasos:**
1. Hacer clic **específicamente** en el ícono de duplicar de una card (no en el
   cuerpo de la card).
**Resultado esperado:**
- Se abre el modal de duplicación.
- La app **no** navega a la vista de detalle del presupuesto.
**Estado:** ⬜ Pendiente

---

### TC-010 — Conflicto: mes/año destino ya tiene presupuesto (409)
**Precondición:** Ya existe un presupuesto en el mes/año destino (ej. julio
2026 ya fue creado, por TC-001).
**Pasos:**
1. Abrir el modal de duplicar desde el presupuesto origen.
2. Seleccionar como destino el mes/año que **ya tiene** presupuesto.
3. Hacer clic en "Duplicar mes".
**Resultado esperado:**
- Aparece un bloque de error rojo dentro del modal con el mensaje del backend
  (ej. "Budget already exists for month 7/2026").
- El modal **no se cierra** y no se pierde lo escrito (mes/año/nombre siguen).
- No se crea ningún presupuesto, ingreso ni gasto nuevo (verificable revisando
  que los contadores de la vista destino no cambiaron).
**Estado:** ⬜ Pendiente

---

### TC-011 — Idempotencia: no se puede duplicar dos veces al mismo destino
**Precondición:** TC-001 ya creó el presupuesto de julio 2026.
**Pasos:**
1. Intentar duplicar de nuevo el mismo origen hacia julio 2026.
**Resultado esperado:**
- Se bloquea con el mismo error 409 de TC-010.
- No se duplican los ingresos ni gastos (no quedan registros por duplicado en
  julio 2026).
**Estado:** ⬜ Pendiente

---

### TC-012 — Los ingresos/gastos copiados aparecen en sus vistas tras duplicar
**Precondición:** Se acaba de duplicar a un mes destino libre.
**Pasos:**
1. Sin recargar manualmente, navegar a `/finances/incomes` y `/finances/expenses`.
2. Filtrar por el mes destino.
**Resultado esperado:**
- Los ingresos y gastos recreados ya aparecen (las queries de `expenses` e
  `incomes` fueron invalidadas por el hook al duplicar).
- Los montos y descripciones coinciden con los del mes origen.
**Estado:** ⬜ Pendiente

---

## Casos MCP — tool `duplicate_budget` en `todo-api`

> Ejecutados vía `/mcp` por `@tester` de backend. El agente debe **confirmar
> con el usuario** antes de invocar la tool (regla del system prompt), pero la
> prueba técnica valida el shape de la respuesta y el manejo de errores.

### TC-MCP-001 — Duplicar a un período libre
**Herramienta probada:** `duplicate_budget` en `todo-api`
**Precondición:** Existe un presupuesto origen con ítems, ingresos y gastos en
su mes. El mes/año destino no tiene presupuesto.
**Input de prueba:**
```json
{
  "sourceBudgetId": "<UUID del presupuesto origen>",
  "month": 8,
  "year": 2026,
  "name": "Presupuesto agosto 2026"
}
```
**Output esperado:**
- Respuesta `ok` con un objeto que contiene:
  - `budget`: el presupuesto destino creado, con `items` cargados y `month`/
    `year` = destino.
  - `itemsCopied`, `incomesCopied`, `expensesCopied`: contadores > 0 y
    coincidentes con el contenido del mes origen.
- En la BD quedan creados el presupuesto, sus ítems, y los ingresos/gastos del
  mes destino con fechas desplazadas y clampeadas; los gastos conservan su
  `creditCardId`.
**Estado:** ⬜ Pendiente

---

### TC-MCP-002 — Conflicto: período destino ocupado (409)
**Herramienta probada:** `duplicate_budget` en `todo-api`
**Precondición:** El mes/año destino (ej. agosto 2026 de TC-MCP-001) ya tiene
un presupuesto.
**Input de prueba:**
```json
{
  "sourceBudgetId": "<UUID del presupuesto origen>",
  "month": 8,
  "year": 2026
}
```
**Output esperado:**
- La tool responde con un texto de error (`Error: Budget already exists for
  month 8/2026`), sin crear ninguna fila.
- Según el system prompt, el agente debe consultar `list_budgets` del destino y
  avisar al usuario, sin reintentar.
**Estado:** ⬜ Pendiente

---

### TC-MCP-003 — Origen inexistente (404)
**Herramienta probada:** `duplicate_budget` en `todo-api`
**Precondición:** Ninguna (se usa un UUID que no corresponde a ningún presupuesto).
**Input de prueba:**
```json
{
  "sourceBudgetId": "00000000-0000-0000-0000-000000000000",
  "month": 9,
  "year": 2026
}
```
**Output esperado:**
- La tool responde con un texto de error (`Error: Budget ...
  not found`), sin crear nada.
**Estado:** ⬜ Pendiente
