# test-024 — Completar subtareas automáticamente al completar la tarea padre

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Actividad "Proyecto casa" (padre, nivel 1, `pending`) | `POST /activities` | `e92818df-45ab-4528-bb57-2b2c757be93e` | TC-024-001, TC-024-002, TC-024-004 | ✅ |
| Subtarea "Pintar sala" (nivel 2, `in_progress`, hija de "Proyecto casa") | `POST /activities` | `7af429c2-a0b0-4253-8353-9858420063c6` | TC-024-001, TC-024-002, TC-024-004 | ✅ |
| Subtarea "Comprar pintura" (nivel 3, `pending`, hija de "Pintar sala") | `POST /activities` | `68ca8141-11ec-4c66-8006-ab0a5342c7ac` | TC-024-002 | ✅ |
| Subtarea "Encargo cancelado" (nivel 2, `cancelled`, hija de "Proyecto casa") | `POST` + `PATCH /activities` | `adbcbe9b-c8e9-41cd-b714-2dc1ccbaf604` | TC-024-003 | ✅ |
| Actividad "Tarea suelta sin subtareas" (`pending`) | `POST /activities` | `b291013a-cc51-40d9-b95e-370ccdb6a1a9` | TC-024-006 | ✅ |
| Actividad "Padre para renombrar" (`pending`) | `POST /activities` | `b8304261-8406-4549-9f29-2a5a70b82507` | TC-024-005 | ✅ |
| Subtarea "Hija que no debe cambiar" (`in_progress`, hija de "Padre para renombrar") | `POST /activities` | `06827dc4-f57c-46e6-985e-73bebd9c2755` | TC-024-005 | ✅ |
| Actividad "Refresco - Padre" (`pending`) | `POST /activities` | `7dc15879-87b6-46d4-acd4-0e3b4b2a71f5` | TC-024-007 | ✅ |
| Subtarea "Refresco - Hija" (`pending`, hija de "Refresco - Padre") | `POST /activities` | `7be67aca-85a1-4e73-9a06-ae739836362f` | TC-024-007 | ✅ |
| Actividad "MCP - Padre" (`pending`, entorno **local**) | `POST /activities` | `8925e7d6-c8b0-4383-9548-4f96138f301d` | TC-MCP-024-001 (no usado — ver hallazgo) | ✅ |
| Subtarea "MCP - Hija" (`pending`, hija de "MCP - Padre") | `POST /activities` | `e78659a1-ebaf-4f9b-adef-a17b557c073c` | TC-MCP-024-001 (no usado — ver hallazgo) | ✅ |
| Actividad "[TEST spec-024] MCP - Padre" (`pending`, entorno **producción**, vía `create_activity` MCP) | MCP `create_activity` | `5c344b48-b809-433a-9bb4-d88bbe1995dc` | TC-MCP-024-001 | ✅ |
| Subtarea "[TEST spec-024] MCP - Hija" (`pending`, hija, entorno **producción**) | MCP `create_activity` | `c5d60ebf-13f8-4bea-afff-f2a4f7a5a3c1` | TC-MCP-024-001 | ✅ |

**Notas de uso:**
- El árbol de "Proyecto casa" cubre TC-024-001, 002, 003 y 004 en una sola
  cadena de ejecución: la única acción de completar el padre ocurre en
  TC-024-001 y arrastra en el mismo momento a "Pintar sala", "Comprar
  pintura" (nieto) y "Encargo cancelado" — por eso "Encargo cancelado" se creó
  y pasó a `cancelled` **antes** de esa primera compleción: como el criterio 6
  impide que un padre ya `completed` vuelva a disparar la cascada, si se
  hubiera creado después ya no se habría propagado.
- Se preparó un árbol **independiente** para TC-024-007 ("Refresco - Padre/
  Hija") y otro para TC-MCP-024-001 ("MCP - Padre/Hija"), ambos intactos en
  `pending`, para no depender del árbol ya consumido por TC-024-001–004.
- Todas las actividades de esta ronda quedan **sin proyecto** asociado.
- El backend de desarrollo estaba caído al preparar los datos; se levantó con
  `npm run start:dev` (puerto `3000`, según `PORT` en `.env` — el `CLAUDE.md`
  documenta `3002` para este entorno, pero el valor real configurado es
  `3000`; usar `http://localhost:3000/api/v1` para esta ronda).

**Entorno de pruebas:** desarrollo (`http://localhost:3000/api/v1`)
**Fecha de la ronda:** 2026-08-13

## Casos de prueba

### TC-024-001 — Completar el padre completa su subtarea directa (edición rápida en card)
**Precondición:** Existe la actividad padre "Proyecto casa"
(`e92818df-45ab-4528-bb57-2b2c757be93e`, `pending`) con la subtarea directa
"Pintar sala" (`7af429c2-a0b0-4253-8353-9858420063c6`, `in_progress`) visible
en su lista de subtareas.
**Datos de prueba usados:** `e92818df-45ab-4528-bb57-2b2c757be93e`,
`7af429c2-a0b0-4253-8353-9858420063c6`
**Pasos:**
1. Navegar a la vista donde aparece la ActivityCard de "Proyecto casa" (lista
   general o vista del proyecto).
2. Usar la edición rápida de status en la card (badge/selector de status) para
   cambiar "Proyecto casa" a `completed`.
3. Abrir el detalle de "Proyecto casa" (o expandir sus subtareas si la card lo
   permite inline) y localizar "Pintar sala".
**Resultado esperado:** "Pintar sala" aparece como `completed`, sin haberla
tocado manualmente.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — "Pintar sala" quedó `completed` tras
completar "Proyecto casa", sin tocarla manualmente.

---

### TC-024-002 — La propagación es recursiva: nietos también se completan
**Precondición:** Árbol de 3 niveles: "Proyecto casa"
(`e92818df-45ab-4528-bb57-2b2c757be93e`, padre) → "Pintar sala"
(`7af429c2-a0b0-4253-8353-9858420063c6`, hija) → "Comprar pintura"
(`68ca8141-11ec-4c66-8006-ab0a5342c7ac`, `pending`, subtarea de "Pintar sala").
**Datos de prueba usados:** `e92818df-45ab-4528-bb57-2b2c757be93e`,
`7af429c2-a0b0-4253-8353-9858420063c6`, `68ca8141-11ec-4c66-8006-ab0a5342c7ac`
**Pasos:**
1. Desde el detalle del proyecto o la card de "Proyecto casa", marcar
   "Proyecto casa" como `completed` (si no se hizo ya en TC-024-001, hacerlo
   ahora).
2. Navegar al detalle de "Pintar sala" y revisar su lista de subtareas.
3. Localizar "Comprar pintura".
**Resultado esperado:** "Comprar pintura" (nieto de "Proyecto casa") aparece
como `completed`, aunque nunca se tocó directamente ni es subtarea directa del
padre completado.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — "Comprar pintura" (nieta) quedó `completed`
por la misma propagación, confirmando el recorrido recursivo.

---

### TC-024-003 — Una subtarea "cancelled" también se completa
**Precondición:** Existe la actividad padre "Proyecto casa"
(`e92818df-45ab-4528-bb57-2b2c757be93e`) con la subtarea "Encargo cancelado"
(`adbcbe9b-c8e9-41cd-b714-2dc1ccbaf604`) en status `cancelled`. Este es el
**mismo padre** que en TC-024-001/002 — la compleción ya ejecutada en
TC-024-001 es la misma acción que arrastra a "Encargo cancelado"; este caso
solo verifica su resultado.
**Datos de prueba usados:** `e92818df-45ab-4528-bb57-2b2c757be93e`,
`adbcbe9b-c8e9-41cd-b714-2dc1ccbaf604`
**Pasos:**
1. Antes de ejecutar TC-024-001, verificar en la UI que "Encargo cancelado"
   muestra el badge de status `cancelled`.
2. Tras completar "Proyecto casa" en TC-024-001 (no hace falta repetir la
   acción — ejecutar este caso inmediatamente después de aquel).
3. Revisar el status de "Encargo cancelado" en su card o en el detalle del
   padre.
**Resultado esperado:** "Encargo cancelado" pasa a `completed` — no se
preserva su status `cancelled` previo (decisión explícita del spec: se
arrastran todas las subtareas sin excepción).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — "Encargo cancelado" pasó de `cancelled` a
`completed` por la misma propagación, confirmando que no se preserva el
status previo.

---

### TC-024-004 — Desmarcar el padre no revierte a las subtareas
**Precondición:** "Proyecto casa" (`e92818df-45ab-4528-bb57-2b2c757be93e`) ya
está `completed` y sus subtareas fueron propagadas a `completed` en un caso
anterior (TC-024-001 / TC-024-002).
**Datos de prueba usados:** `e92818df-45ab-4528-bb57-2b2c757be93e`,
`7af429c2-a0b0-4253-8353-9858420063c6`
**Pasos:**
1. Confirmar en la UI que "Pintar sala" está `completed`.
2. Desde la edición rápida en la card de "Proyecto casa", cambiar su status de
   `completed` a `pending` (o cualquier otro status distinto de `completed`).
3. Revisar el status de "Pintar sala" nuevamente, sin recargar la página.
**Resultado esperado:** "Proyecto casa" vuelve a `pending`, pero "Pintar sala"
**permanece** en `completed` — el sistema no revierte trabajo por su cuenta.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — al desmarcar "Proyecto casa" a `pending`,
"Pintar sala" permaneció en `completed`, confirmando que la propagación es de
un solo sentido.

---

### TC-024-005 — Renombrar el padre sin tocar su status no afecta a las subtareas
**Precondición:** Existe "Padre para renombrar"
(`b8304261-8406-4549-9f29-2a5a70b82507`, `pending`) con la subtarea "Hija que
no debe cambiar" (`06827dc4-f57c-46e6-985e-73bebd9c2755`, `in_progress`).
**Datos de prueba usados:** `b8304261-8406-4549-9f29-2a5a70b82507`,
`06827dc4-f57c-46e6-985e-73bebd9c2755`
**Pasos:**
1. Confirmar en la UI que "Hija que no debe cambiar" muestra status
   `in_progress`.
2. Usar la edición rápida de nombre en la card de "Padre para renombrar" para
   cambiar el texto (ej. agregar " (editado)"), sin tocar su status.
3. Revisar el status de "Hija que no debe cambiar".
**Resultado esperado:** El nombre del padre se actualiza; "Hija que no debe
cambiar" **sigue** en `in_progress`, sin cambios.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — renombrar el padre sin tocar su status no
afectó el status de la subtarea.

---

### TC-024-006 — Completar una tarea sin subtareas funciona sin errores
**Precondición:** Existe "Tarea suelta sin subtareas"
(`b291013a-cc51-40d9-b95e-370ccdb6a1a9`, `pending`), sin ninguna subtarea
asociada.
**Datos de prueba usados:** `b291013a-cc51-40d9-b95e-370ccdb6a1a9`
**Pasos:**
1. Desde la edición rápida en su card, cambiar el status a `completed`.
**Resultado esperado:** El status cambia a `completed` sin errores en
consola ni mensajes de fallo en la UI — el comportamiento es idéntico al que
existía antes de este spec.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — completar una tarea sin subtareas funcionó
sin errores.

---

### TC-024-007 — Refresco automático sin recargar la página (invalidación de React Query)
**Precondición:** Árbol dedicado e intacto: "Refresco - Padre"
(`7dc15879-87b6-46d4-acd4-0e3b4b2a71f5`, `pending`) con la subtarea "Refresco
- Hija" (`7be67aca-85a1-4e73-9a06-ae739836362f`, `pending`), visible en el
detalle abierto en pantalla.
**Datos de prueba usados:** `7dc15879-87b6-46d4-acd4-0e3b4b2a71f5`,
`7be67aca-85a1-4e73-9a06-ae739836362f`
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
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — la lista de subtareas se refrescó sola
mostrando "Refresco - Hija" como `completed`, sin recargar la página; confirma
que no hacía falta ningún cambio de frontend para esta invalidación.

---

## Casos de prueba (MCP)

### TC-MCP-024-001 — Completar una tarea vía `update_activity` completa su árbol de subtareas
**Herramienta probada:** `update_activity` en `todo-api`
**Precondición:** Existe la actividad padre "MCP - Padre"
(`8925e7d6-c8b0-4383-9548-4f96138f301d`, `pending`) con la subtarea directa
"MCP - Hija" (`e78659a1-ebaf-4f9b-adef-a17b557c073c`, `pending`).
**Input de prueba:**
```json
{
  "id": "8925e7d6-c8b0-4383-9548-4f96138f301d",
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
**Estado:** ❌ Fallido (no imputable al código — ver hallazgo)
**Hallazgos:** El MCP `to-do-api` conectado en esta sesión apunta a
**producción** (`https://steadfast-ambition-production.up.railway.app/mcp`),
no al backend local. Los ids `8925e7d6-...` y `e78659a1-...` de la
precondición solo existían en local, así que la primera llamada devolvió
`Activity ... not found`. Con autorización explícita del usuario en esta
sesión, se crearon en **producción** un padre y una hija de prueba
(`[TEST spec-024] MCP - Padre` / `Hija`), se ejecutó `update_activity` con
`status: "completed"` sobre el padre, y al verificar con
`get_activity_subtasks` la hija seguía en `pending` — la cascada **no se
aplicó**. Causa: producción todavía corre el código previo a este spec (la
implementación solo existe en la rama local `feature/complete-subtasks-with-parent`,
sin mergear ni desplegar) — no es un defecto del código, es un caso que no
puede pasar hasta el despliegue. Los datos de prueba creados en producción
(`[TEST spec-024] MCP - Padre` / `Hija`) se eliminaron de inmediato tras la
verificación y se confirmó su eliminación (`get_activity` → 404). **Este caso
debe re-ejecutarse tras desplegar el spec-024 a producción**, antes de dar la
ronda por cerrada — o alternativamente, en una sesión donde el MCP apunte al
backend local.

## Resumen de la ronda
- Aprobados: 7 (TC-024-001 a 007) — Fallidos: 1 (TC-MCP-024-001, no imputable
  al código, ver hallazgo) — Pendientes: 0
- Hallazgos escalados a `spec/backlog.md`: ninguno. TC-MCP-024-001 no es un
  bug: producción aún no tiene desplegado el spec-024. Queda documentado como
  pendiente de re-ejecución post-despliegue en su propio hallazgo, no como
  deuda técnica nueva.
- Limpieza de datos de prueba: ✅ Completada — los 11 recursos del entorno
  local y los 2 recursos creados en producción para TC-MCP-024-001 fueron
  eliminados vía API/MCP y su eliminación se verificó con `404` en todos los
  casos.
