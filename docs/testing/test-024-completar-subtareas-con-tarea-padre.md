# test-024 — Completar subtareas automáticamente al completar la tarea padre

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Actividad "Proyecto casa" (padre, nivel 1, `pending`) | `POST /activities` | `{{id-nivel-1}}` | TC-024-001, TC-024-002, TC-024-004, TC-024-005 | ⬜ |
| Subtarea "Pintar sala" (nivel 2, `in_progress`, `parentId: {{id-nivel-1}}`) | `POST /activities` | `{{id-nivel-2}}` | TC-024-001, TC-024-002, TC-024-004, TC-024-005 | ⬜ |
| Subtarea "Comprar pintura" (nivel 3, `pending`, `parentId: {{id-nivel-2}}`) | `POST /activities` | `{{id-nivel-3}}` | TC-024-002 | ⬜ |
| Subtarea "Encargo cancelado" (nivel 2, `cancelled`, `parentId: {{id-nivel-1}}`) | `POST /activities` | `{{id-cancelada}}` | TC-024-003 | ⬜ |
| Actividad "Tarea suelta sin subtareas" (`pending`) | `POST /activities` | `{{id-sin-subtareas}}` | TC-024-006 | ⬜ |
| Actividad "Padre para renombrar" (`pending`) | `POST /activities` | `{{id-padre-renombrar}}` | TC-024-005 | ⬜ |
| Subtarea "Hija que no debe cambiar" (`in_progress`, `parentId: {{id-padre-renombrar}}`) | `POST /activities` | `{{id-hija-renombrar}}` | TC-024-005 | ⬜ |

**Notas de uso:**
- El árbol de 3 niveles (`{{id-nivel-1}}` → `{{id-nivel-2}}` → `{{id-nivel-3}}`) se
  reutiliza en varios casos; no completar el padre hasta llegar al TC-024-002
  para poder observar primero el estado intacto en TC-024-001 sobre un
  subconjunto, o crear un árbol independiente por caso si se prefiere no
  encadenar precondiciones — decidir al preparar los datos según el orden real
  de ejecución.
- `{{id-cancelada}}` debe crearse explícitamente con `status: "cancelled"` en
  el payload (o crearse `pending` y pasarse a `cancelled` con un `PATCH`
  posterior) para dejar clara la precondición del criterio 3.
- Todas las actividades de esta ronda deben quedar **sin proyecto** asociado,
  salvo que se decida verificarlas dentro de un proyecto concreto — en ese
  caso, documentar aquí el proyecto usado.

**Entorno de pruebas:** desarrollo (`http://localhost:3002/api/v1`)
**Fecha de la ronda:** {{pendiente}}

## Casos de prueba

### TC-024-001 — Completar el padre completa su subtarea directa (edición rápida en card)
**Precondición:** Existe la actividad padre `{{id-nivel-1}}` ("Proyecto casa",
`pending`) con la subtarea directa `{{id-nivel-2}}` ("Pintar sala",
`in_progress`) visible en su lista de subtareas.
**Datos de prueba usados:** `{{id-nivel-1}}`, `{{id-nivel-2}}`
**Pasos:**
1. Navegar a la vista donde aparece la ActivityCard de "Proyecto casa" (lista
   general o vista del proyecto).
2. Usar la edición rápida de status en la card (badge/selector de status) para
   cambiar "Proyecto casa" a `completed`.
3. Abrir el detalle de "Proyecto casa" (o expandir sus subtareas si la card lo
   permite inline) y localizar "Pintar sala".
**Resultado esperado:** "Pintar sala" aparece como `completed`, sin haberla
tocado manualmente.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-002 — La propagación es recursiva: nietos también se completan
**Precondición:** Árbol de 3 niveles: `{{id-nivel-1}}` (padre) →
`{{id-nivel-2}}` (hija) → `{{id-nivel-3}}` ("Comprar pintura", `pending`,
subtarea de `{{id-nivel-2}}`).
**Datos de prueba usados:** `{{id-nivel-1}}`, `{{id-nivel-2}}`, `{{id-nivel-3}}`
**Pasos:**
1. Desde el detalle del proyecto o la card de "Proyecto casa", marcar
   "Proyecto casa" como `completed` (si no se hizo ya en TC-024-001, hacerlo
   ahora).
2. Navegar al detalle de "Pintar sala" y revisar su lista de subtareas.
3. Localizar "Comprar pintura".
**Resultado esperado:** "Comprar pintura" (nieto de "Proyecto casa") aparece
como `completed`, aunque nunca se tocó directamente ni es subtarea directa del
padre completado.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-003 — Una subtarea "cancelled" también se completa
**Precondición:** Existe la actividad padre `{{id-nivel-1}}` con la subtarea
`{{id-cancelada}}` ("Encargo cancelado") en status `cancelled`.
**Datos de prueba usados:** `{{id-nivel-1}}`, `{{id-cancelada}}`
**Pasos:**
1. Verificar en la UI que "Encargo cancelado" muestra el badge de status
   `cancelled` antes de continuar.
2. Completar "Proyecto casa" desde la edición rápida en su card (si ya estaba
   completada de un caso anterior, usar un padre nuevo para este caso y
   documentarlo aquí).
3. Revisar el status de "Encargo cancelado" en su card o en el detalle del
   padre.
**Resultado esperado:** "Encargo cancelado" pasa a `completed` — no se
preserva su status `cancelled` previo (decisión explícita del spec: se
arrastran todas las subtareas sin excepción).
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-004 — Desmarcar el padre no revierte a las subtareas
**Precondición:** "Proyecto casa" (`{{id-nivel-1}}`) ya está `completed` y sus
subtareas fueron propagadas a `completed` en un caso anterior (TC-024-001 /
TC-024-002).
**Datos de prueba usados:** `{{id-nivel-1}}`, `{{id-nivel-2}}`
**Pasos:**
1. Confirmar en la UI que "Pintar sala" está `completed`.
2. Desde la edición rápida en la card de "Proyecto casa", cambiar su status de
   `completed` a `pending` (o cualquier otro status distinto de `completed`).
3. Revisar el status de "Pintar sala" nuevamente, sin recargar la página.
**Resultado esperado:** "Proyecto casa" vuelve a `pending`, pero "Pintar sala"
**permanece** en `completed` — el sistema no revierte trabajo por su cuenta.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-005 — Renombrar el padre sin tocar su status no afecta a las subtareas
**Precondición:** Existe "Padre para renombrar" (`{{id-padre-renombrar}}`,
`pending`) con la subtarea "Hija que no debe cambiar"
(`{{id-hija-renombrar}}`, `in_progress`).
**Datos de prueba usados:** `{{id-padre-renombrar}}`, `{{id-hija-renombrar}}`
**Pasos:**
1. Confirmar en la UI que "Hija que no debe cambiar" muestra status
   `in_progress`.
2. Usar la edición rápida de nombre en la card de "Padre para renombrar" para
   cambiar el texto (ej. agregar " (editado)"), sin tocar su status.
3. Revisar el status de "Hija que no debe cambiar".
**Resultado esperado:** El nombre del padre se actualiza; "Hija que no debe
cambiar" **sigue** en `in_progress`, sin cambios.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-006 — Completar una tarea sin subtareas funciona sin errores
**Precondición:** Existe "Tarea suelta sin subtareas" (`{{id-sin-subtareas}}`,
`pending`), sin ninguna subtarea asociada.
**Datos de prueba usados:** `{{id-sin-subtareas}}`
**Pasos:**
1. Desde la edición rápida en su card, cambiar el status a `completed`.
**Resultado esperado:** El status cambia a `completed` sin errores en
consola ni mensajes de fallo en la UI — el comportamiento es idéntico al que
existía antes de este spec.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

### TC-024-007 — Refresco automático sin recargar la página (invalidación de React Query)
**Precondición:** Árbol de al menos 2 niveles, con el detalle del proyecto o
de la actividad padre abierto mostrando la lista de subtareas en pantalla
(reutilizar `{{id-nivel-1}}` / `{{id-nivel-2}}` con un árbol nuevo si los
anteriores ya quedaron `completed`, o preparar un árbol dedicado y
documentarlo aquí).
**Pasos:**
1. Abrir el detalle de la actividad padre en una pestaña, dejando visible la
   lista de subtareas con su status actual (`pending` / `in_progress`).
2. **Sin recargar la página**, en esa misma vista (o desde otra card visible
   simultáneamente, ej. la lista general en otra pestaña del mismo navegador),
   completar el padre usando la edición rápida.
3. Observar la lista de subtareas en la vista de detalle que quedó abierta,
   sin presionar F5 ni volver a navegar a la ruta.
**Resultado esperado:** La lista de subtareas se actualiza sola y muestra el
nuevo status `completed` en todas ellas, sin que el usuario recargue la
página — confirma que la invalidación de la query key `['activities']` (y por
prefijo `['activities', parentId, 'subtasks']`) dispara el refetch esperado.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

---

## Casos de prueba (MCP)

### TC-MCP-024-001 — Completar una tarea vía `update_activity` completa su árbol de subtareas
**Herramienta probada:** `update_activity` en `todo-api`
**Precondición:** Existe una actividad padre con al menos una subtarea directa
en status distinto de `completed` (puede reutilizarse un árbol nuevo creado
para este caso, o el de TC-024-001/002 si aún no fue completado por otro
caso — documentar el id usado al ejecutar).
**Input de prueba:**
```json
{
  "id": "{{id-del-padre}}",
  "status": "completed"
}
```
**Output esperado:**
1. La tool devuelve la actividad padre actualizada con `status: "completed"`,
   con el mismo shape que devuelve hoy (sin cambios de contrato).
2. Al consultar `get_activity_subtasks` (o `get_activity` del hijo) para el
   mismo padre, todas las subtareas —incluidas las de niveles más profundos—
   aparecen con `status: "completed"`.
3. El agente, según su system prompt actualizado
   (`docs/mcps/asistente-personal.system-prompt.md`), debe advertir al usuario
   de este efecto en cascada antes o después de ejecutar la acción.
**Estado:** ⬜ Pendiente
**Hallazgos:** {{pendiente}}

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: 8
- Hallazgos escalados a `spec/backlog.md`: {{pendiente}}
- Limpieza de datos de prueba: ⬜ Pendiente
