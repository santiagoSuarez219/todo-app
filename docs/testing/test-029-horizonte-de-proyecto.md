# test-029 — Horizonte de proyecto (`horizon`)

> Redactado en modo test-first, junto con `spec/spec-029-horizonte-de-proyecto.md`,
> **antes** de que exista una sola línea de implementación. Todos los casos
> quedan en `⬜ Pendiente` hasta que la Fase 4 (frontend) esté completa y el
> usuario los ejecute.
>
> Paquete "Actividades — modelo de capas" (specs 027→032, rama
> `feature/actividades-modelo-capas`). Este spec es el único del paquete que
> toca `Project` y no `Activity`.

## Datos de prueba
> Recursos a crear vía API/UI para poder ejecutar estos casos. Se completan con
> identificadores reales y estado de eliminación **al ejecutar** la ronda (no
> ahora), siguiendo "Pruebas manuales asistidas por Claude" del `CLAUDE.md` raíz.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| "[TEST spec-029] PROJ-A — Default sin horizon" (`startDate: 2026-09-01`, sin `horizon` en el body) | `POST /projects` (creada vía UI) | `8838c886-643b-4dcd-b35f-719dde90717b` | TC-029-001 | ✅ |
| "[TEST spec-029] PROJ-B — Ahora" (`horizon: now`) | `POST /projects` (creada vía UI) | `b858b231-1d27-4f12-ae87-83d58a0a3956` | TC-029-002, TC-029-004, TC-029-006 | ✅ |
| "[TEST spec-029] PROJ-C — Siguiente" (`horizon: next`, explícito) | `POST /projects` | `05730086-d756-4872-928a-f6cc0c219b27` | TC-029-002 | ✅ |
| "[TEST spec-029] PROJ-D — Después" (`horizon: later`) | `POST /projects` | `2e9f0e1a-c427-4e77-a971-f8816bed4a14` | TC-029-002 | ✅ |
| "[TEST spec-029] PROJ-E — Algún día" (`horizon: someday`) | `POST /projects` | `7eb68cf7-8585-45cc-acda-568cf768bc0d` | TC-029-002 | ✅ |
| "[TEST spec-029] PROJ-F — Horizon inválido (rechazado)" (`horizon: 'urgente'`, no debe llegar a crearse) | `POST /projects` (esperado 400) | — (no se crea) | TC-029-003 | — |
| "[TEST spec-029] PROJ-G — Movimiento entre horizontes" (`horizon: next` al crear) | `POST /projects` (precreada vía API, ya que la edición vía UI es el foco del caso, no la creación) | `48dc314d-63d9-4ce0-a137-634441973aef` | TC-029-005 | ✅ |
| "[TEST spec-029] PROJ-H — Independencia de status" (`status: paused`, `horizon: now`) | `POST /projects` (creada vía UI) | `e9b0026e-a9f1-46ad-8c5e-a940134f7b55` | TC-029-007 | ✅ |
| "[TEST spec-029] PROJ-I — WIP now #2" / "PROJ-J — WIP now #3" (ambos `horizon: now`, junto a PROJ-B) | `POST /projects` (creadas vía UI) | No se encontraron en la base al verificar (ver Hallazgos de TC-029-008) | TC-029-008 | — |
| "[TEST spec-029] PROJ-K — Varias in_progress" (`horizon: now`) + 3 actividades `status: in_progress` sobre ella | `POST /projects` + `POST /activities` ×3 (vía UI) | `45329a07-397e-4001-a22d-88d3de5a3102` (proyecto), `7bd8e6ce-5883-49a6-8303-2755ada069a5`, `b6d83f3d-75a8-460e-8de0-0d99b59b8181`, `1bf34502-93e6-47bb-8d6d-3b4a401bda4a` (actividades) | TC-029-009 | ✅ |
| "[TEST spec-029] PROJ-L — MCP create_project con horizon" (`horizon: later` vía MCP, luego `update_project` a `now` en TC-MCP-029-002) | `tools/call create_project` vía `/mcp` local | `a5fac101-dab7-4b44-95c6-3cf63c4e5f04` | TC-MCP-029-001, TC-MCP-029-002, TC-MCP-029-003, TC-MCP-029-004 | ✅ |
| "[TEST spec-029] MCP - horizon inválido" (`horizon: 'urgente'`, rechazado por Zod, no debe llegar a crearse) | `tools/call create_project` vía `/mcp` local (esperado error -32602) | — (no se creó, MCP rechazó el input) | TC-MCP-029-003 | — |
| Proyecto real preexistente (creado **antes** de aplicar la migración de spec-029, sin `horizon` propio) | — (recurso preexistente, no se crea en esta ronda) | `{{id-legacy}}` | TC-029-010 | — (no se elimina, es un dato real) |

**Notas de uso:**
- Todos los proyectos de prueba llevan el prefijo `[TEST spec-029]` en el
  nombre para distinguirlos de proyectos reales durante la limpieza.
- Al cerrar la ronda, eliminar todos los proyectos de prueba vía
  `DELETE /projects/:id` (esto también elimina en cascada las actividades de
  PROJ-K, según la lógica ya documentada de `Project.activities` con
  `onDelete: CASCADE`) y confirmar `404` posterior.
- **Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1` /
  `http://localhost:5173`) — confirmado, backend local levantado. Confirmar
  antes de crear cualquier dato que el MCP usado para `TC-MCP-029-001` apunta
  a local, no a producción (mismo chequeo que se hizo en la ronda de spec-026).
- **Fecha de la ronda:** 2026-08-16.
- **Notas de preparación:** solo PROJ-G se precreó vía API (id
  `48dc314d-63d9-4ce0-a137-634441973aef`) porque el foco de TC-029-005 es la
  edición, no la creación. El resto de proyectos (A, B, C, D, E, H, I, J, K)
  se crean en vivo durante cada caso. **TC-029-010 queda diferido** — requiere
  datos legacy reales previos a la migración (ya aplicada en local), no se
  puede simular en esta ronda.

## Casos de prueba

### TC-029-001 — Crear un proyecto sin especificar horizonte usa el default "Siguiente"
**Precondición:** Ninguna.
**Datos de prueba usados:** `8838c886-643b-4dcd-b35f-719dde90717b` — PROJ-A.
**Pasos:**
1. Ir a `/projects` y hacer clic en "+ Nuevo proyecto".
2. Completar solo nombre ("[TEST spec-029] PROJ-A — Default sin horizon") y fecha de inicio, **sin tocar** el selector de horizonte.
3. Guardar.
4. Ubicar la card/fila del proyecto recién creado en la lista.
**Resultado esperado:** El selector de horizonte del formulario ya mostraba "Siguiente" preseleccionado antes de guardar (ver también TC-029-006). El proyecto creado muestra el badge de horizonte "Siguiente".
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado también vía API: `horizon: "next"` sin haberlo especificado en la creación. Sin observaciones del usuario.

---

### TC-029-002 — Crear un proyecto con cada uno de los cuatro horizontes
**Precondición:** Ninguna.
**Datos de prueba usados:** `b858b231-1d27-4f12-ae87-83d58a0a3956` PROJ-B (`now`), `05730086-d756-4872-928a-f6cc0c219b27` PROJ-C (`next`), `2e9f0e1a-c427-4e77-a971-f8816bed4a14` PROJ-D (`later`), `7eb68cf7-8585-45cc-acda-568cf768bc0d` PROJ-E (`someday`).
**Pasos:**
1. Crear cuatro proyectos, uno por cada valor del selector de horizonte: "Ahora", "Siguiente", "Después", "Algún día".
2. Revisar la lista de proyectos y el badge de cada uno.
**Resultado esperado:** Cada proyecto queda persistido con el horizonte elegido y el badge muestra la etiqueta en español correspondiente ("Ahora" / "Siguiente" / "Después" / "Algún día"), sin mezclarse entre sí.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía API: los 4 proyectos quedaron con `horizon` correcto (`now`, `next`, `later`, `someday` respectivamente). Sin observaciones del usuario.

---

### TC-029-003 — El formulario no permite enviar un valor de horizonte fuera del enum
**Precondición:** Ninguna.
**Datos de prueba usados:** PROJ-F (no debe llegar a crearse — confirmado, la llamada devolvió 400).
**Pasos:**
1. Confirmar que el `<select>` de horizonte del formulario solo ofrece las cuatro opciones válidas (no hay forma de escribir un valor libre desde la UI).
2. Como verificación complementaria, con la sesión autenticada, intentar `POST /projects` directamente (vía herramienta HTTP, ej. curl/Postman) con `horizon: "urgente"`.
**Resultado esperado:** La UI no ofrece ninguna forma de enviar un valor inválido (cerrado por el propio `<select>`). La llamada directa al endpoint con `horizon: "urgente"` responde `400` con un mensaje de validación claro, y el proyecto no aparece en `/projects`.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificación por API directa: `POST /projects` con `horizon: "urgente"` respondió `400` con mensaje `"horizon must be one of the following values: now, next, later, someday"`, sin crear el proyecto. Confirmado por el usuario que el `<select>` de la UI solo ofrece las 4 opciones válidas. Sin más observaciones.

---

### TC-029-004 — El badge y el filtro de horizonte reflejan el estado actual sin afectar el status
**Precondición:** PROJ-B existe con `horizon: now`.
**Datos de prueba usados:** `b858b231-1d27-4f12-ae87-83d58a0a3956`.
**Pasos:**
1. Ir a `/projects` y ubicar PROJ-B en la lista sin filtro aplicado.
2. Confirmar visualmente el badge "Ahora" junto a su badge de estado (`status`) habitual.
3. Aplicar el filtro de horizonte "Ahora" y confirmar que PROJ-B aparece.
4. Cambiar el filtro a otro horizonte (ej. "Después") y confirmar que PROJ-B **no** aparece.
5. Volver el filtro a "Todos" (o equivalente) y confirmar que PROJ-B reaparece junto al resto.
**Resultado esperado:** El badge de horizonte se distingue visualmente del badge de status (dos ejes separados, sin mezclarse en el mismo componente). El filtro por horizonte muestra/oculta correctamente sin afectar el filtro de status existente (deben poder combinarse o convivir sin error).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones del usuario.

---

### TC-029-005 — `PATCH` mueve un proyecto entre los cuatro horizontes
**Precondición:** PROJ-G existe con `horizon: next`.
**Datos de prueba usados:** `48dc314d-63d9-4ce0-a137-634441973aef`.
**Pasos:**
1. Editar PROJ-G desde la UI y cambiar su horizonte a "Ahora". Guardar y confirmar el badge actualizado.
2. Repetir cambiando a "Después".
3. Repetir cambiando a "Algún día".
4. Repetir volviendo a "Siguiente".
**Resultado esperado:** En cada paso, el proyecto se actualiza sin error y el badge en la lista refleja el nuevo horizonte inmediatamente después de guardar (sin necesidad de recargar la página).
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía API que el horizonte final quedó en `next`, coherente con el último cambio del ciclo. Sin observaciones del usuario.

---

### TC-029-006 — El formulario de creación preselecciona "Siguiente"
**Precondición:** Ninguna.
**Datos de prueba usados:** ninguno (verificación de formulario, sin guardar).
**Pasos:**
1. Ir a `/projects` y hacer clic en "+ Nuevo proyecto".
2. Observar el selector "Horizonte" del formulario **antes** de tocar nada.
3. Cerrar el formulario sin guardar.
**Resultado esperado:** El selector de horizonte muestra "Siguiente" preseleccionado por defecto al abrir el formulario de creación (sin que el usuario haya elegido nada).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones del usuario.

---

### TC-029-007 — `horizon` y `status` son completamente independientes
**Precondición:** Ninguna.
**Datos de prueba usados:** `e9b0026e-a9f1-46ad-8c5e-a940134f7b55` PROJ-H.
**Pasos:**
1. Crear un proyecto con estado "Pausado" y horizonte "Ahora" en el mismo formulario.
2. Guardar.
3. Verificar que no aparece ningún error, advertencia o mensaje de validación cruzada.
4. Editar el proyecto y cambiar solo el estado a "Completado", dejando el horizonte igual.
5. Editar de nuevo y cambiar solo el horizonte a "Después", dejando el estado igual.
**Resultado esperado:** En ningún paso aparece un bloqueo, advertencia o mensaje relacionando `status` con `horizon`. Cada campo se actualiza de forma independiente del otro; el proyecto puede quedar en cualquier combinación de los dos ejes (ej. `completed` + `now`, `paused` + `later`) sin restricción.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía API el estado final: `status: completed` + `horizon: later`, combinación libre sin ningún error cruzado en el camino. Sin observaciones del usuario.

---

### TC-029-008 — Varios proyectos pueden estar en horizonte "Ahora" sin bloqueo
**Precondición:** PROJ-B ya está en `horizon: now` (TC-029-002).
**Datos de prueba usados:** `b858b231-1d27-4f12-ae87-83d58a0a3956` PROJ-B, PROJ-I, PROJ-J.
**Pasos:**
1. Crear PROJ-I con horizonte "Ahora".
2. Crear PROJ-J con horizonte "Ahora".
3. Confirmar que en este punto hay al menos 3 proyectos de prueba en horizonte "Ahora" simultáneamente (PROJ-B, PROJ-I, PROJ-J).
4. Revisar que no aparece ningún mensaje de advertencia, límite alcanzado o bloqueo al crear el segundo/tercer proyecto en "Ahora".
**Resultado esperado:** No existe ningún límite de "un proyecto en `now`" — pueden convivir varios sin ningún tipo de aviso. (El futuro límite de WIP por rol es explícitamente trabajo fuera de este spec.)
**Estado:** ✅ Aprobado
**Hallazgos:** Al verificar vía API (`GET /projects`), no se encontraron PROJ-I ni PROJ-J en la base — solo PROJ-B aparece en horizonte `now` entre los datos de prueba. Se le consultó al usuario si los había creado; el usuario confirmó el caso como aprobado de todas formas. Queda documentado que el criterio "varios proyectos en `now` sin bloqueo" no pudo verificarse empíricamente con 3 proyectos simultáneos en esta ronda — solo con 1 (PROJ-B), sin que apareciera ningún error al crearlo. No se relanzó el caso ni se insistió más allá de la aprobación explícita del usuario.

---

### TC-029-009 — Varias actividades `in_progress` bajo un mismo proyecto no se bloquean por horizonte
**Precondición:** PROJ-K existe con `horizon: now`.
**Datos de prueba usados:** `45329a07-397e-4001-a22d-88d3de5a3102`.
**Pasos:**
1. Crear PROJ-K con horizonte "Ahora".
2. Sobre PROJ-K, crear tres actividades y marcar cada una con estado "En progreso" (`in_progress`).
3. Confirmar que las tres coexisten sin ningún mensaje de error o límite.
**Resultado esperado:** El sistema permite tener múltiples actividades `in_progress` bajo el mismo proyecto (u horizonte) sin ningún bloqueo — spec-029 no introduce ninguna validación sobre `Activity`.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía API: 3 actividades bajo PROJ-K, las tres en `in_progress` simultáneamente. Sin observaciones del usuario.

---

### TC-029-010 — Proyectos existentes antes de la migración quedan en horizonte "Siguiente" (diferido a despliegue)
> Este caso solo puede ejecutarse de forma fiel **en el momento del despliegue**
> de spec-029 sobre datos reales preexistentes (no se puede simular en esta
> ronda sin datos legacy reales) — mismo criterio que `TC-026-016`. Dejar
> `⬜ Pendiente` hasta ese momento.
**Precondición:** Existe al menos un proyecto real creado **antes** de aplicar la migración `AddHorizonToProjects`.
**Datos de prueba usados:** `{{id-legacy}}` (proyecto real, no de prueba).
**Pasos:**
1. Antes de aplicar la migración, anotar el `id` y `name` de un proyecto real existente.
2. Aplicar la migración de spec-029.
3. Consultar el mismo proyecto vía `GET /projects/{{id-legacy}}` (o verlo en la UI).
**Resultado esperado:** El proyecto expone `horizon: "next"` sin haber requerido ninguna acción manual — el `DEFAULT` de la columna en la migración se encarga del backfill.
**Estado:** ⬜ Pendiente (diferido a la ventana de despliegue)
**Hallazgos:**

---

## Casos de prueba (MCP)

### TC-MCP-029-001 — `create_project` con `horizon` crea el proyecto con ese valor
**Herramienta probada:** `create_project` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "name": "[TEST spec-029] PROJ-L — MCP create_project con horizon",
  "startDate": "2026-09-01",
  "horizon": "later"
}
```
**Output esperado:** La tool crea el proyecto y el resultado incluye `horizon: "later"`. Verificar cruzando con `GET /projects/{{id-proj-l}}` por API REST que el valor persistido coincide.
**Estado:** ✅ Aprobado
**Hallazgos:** `create_project` devolvió el proyecto con `id: a5fac101-dab7-4b44-95c6-3cf63c4e5f04` y `horizon: "later"`. Sin observaciones.

---

### TC-MCP-029-002 — `update_project` con `horizon` mueve el proyecto a otro horizonte
**Herramienta probada:** `update_project` en `todo-api`
**Precondición:** PROJ-L existe con `horizon: later` (TC-MCP-029-001).
**Input de prueba:**
```json
{ "id": "{{id-proj-l}}", "horizon": "now" }
```
**Output esperado:** La tool actualiza el proyecto y el resultado incluye `horizon: "now"`. Verificado por REST (`GET /projects/{{id-proj-l}}`) que el cambio persistió.
**Estado:** ✅ Aprobado
**Hallazgos:** `update_project` devolvió `horizon: "now"`. Confirmado además por `GET /projects/a5fac101-...` vía REST (autenticado): `"horizon":"now"`. Sin observaciones.

---

### TC-MCP-029-003 — `create_project`/`update_project` rechazan un `horizon` fuera del enum
**Herramienta probada:** `create_project` y `update_project` en `todo-api`
**Precondición:** PROJ-L existe (para probar `update_project`).
**Input de prueba (create):**
```json
{ "name": "[TEST spec-029] MCP - horizon inválido", "startDate": "2026-09-01", "horizon": "urgente" }
```
**Input de prueba (update):**
```json
{ "id": "{{id-proj-l}}", "horizon": "urgente" }
```
**Output esperado:** Ambas llamadas devuelven un error de validación del schema Zod (`MCP error -32602: Input validation error`, mismo formato que `TC-MCP-026-002`), sin crear ni modificar ningún proyecto.
**Estado:** ✅ Aprobado
**Hallazgos:** Ambas llamadas devolvieron `MCP error -32602: Input validation error` con el enum esperado (`now|next|later|someday`) y sin crear/modificar nada: `create_project` no generó ningún proyecto (no aparece en `list_projects`) y PROJ-L siguió con `horizon: "now"` (verificado por REST) tras el intento de `update_project` con `horizon: "urgente"`. Sin observaciones.

---

### TC-MCP-029-004 — `get_project` / `list_projects` exponen `horizon` sin cambios de schema
**Herramienta probada:** `get_project` y `list_projects` en `todo-api`
**Precondición:** Existen al menos dos proyectos de prueba con distinto horizonte (ej. PROJ-B `now`, PROJ-L `now` tras TC-MCP-029-002).
**Input de prueba:**
```json
{}
```
**Output esperado:** El payload de cada proyecto en `list_projects` y el de `get_project` incluyen `horizon` con el valor real persistido, sin necesidad de ningún cambio de schema adicional (el output ya trae la entidad completa).
**Estado:** ✅ Aprobado
**Hallazgos:** `get_project` sobre PROJ-L devolvió `horizon: "now"`. `list_projects` devolvió el campo `horizon` en cada uno de los proyectos de la base (verificado que múltiples valores del enum aparecen simultáneamente: `now`, `next`, etc.). Sin cambios de schema necesarios. Sin observaciones.

---

## Resumen de la ronda
- Aprobados: 13 (TC-029-001 a TC-029-009, TC-MCP-029-001 a TC-MCP-029-004) — Fallidos: 0 — Pendientes: 1 (TC-029-010, diferido a la ventana de despliegue por requerir datos legacy reales pre-migración)
- Hallazgos escalados a `spec/backlog.md`: ninguno nuevo en esta ronda. Nota de transparencia (no es un bug, es una desviación de proceso): en TC-029-008 no se pudieron verificar por API los proyectos PROJ-I/PROJ-J (no existían en la base al momento de la verificación); el usuario confirmó explícitamente aprobar el caso igualmente, documentado en el propio caso.
- Limpieza de datos de prueba: ✅ Completada (9 proyectos de prueba + 3 actividades cascadeadas de PROJ-K, todos verificados 404 por REST tras el DELETE)
