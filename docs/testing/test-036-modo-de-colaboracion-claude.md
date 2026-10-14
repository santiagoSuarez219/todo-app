# test-036 — Modo de colaboración con Claude: campo `mode` en actividades

## Datos de prueba
> Recursos creados vía API contra desarrollo local. Todos los nombres llevan el
> prefijo `[TEST-036]` para ubicarlos y detectar restos al limpiar. Deben
> eliminarse al cerrar la ronda (orden inverso a la creación).
> Los identificadores se completan al montar los datos.

| Recurso | Endpoint de creación | Identificador | Eliminado |
|---------|----------------------|---------------|-----------|
| Proyecto "[TEST-036] Proyecto modo" | `POST /projects` (`{ name, startDate }`) | `2ed04b5b-dcbd-4ef1-94e1-94d08d3943ce` | ✅ |
| Actividad `[TEST-036] Autónoma pendiente` (`mode: autonomous`, `status: pending`, en el proyecto) | `POST /activities` | `8916dc3d-b257-4510-8243-3b2d76496948` | ✅ |
| Actividad `[TEST-036] Cowork async en curso` (`mode: cowork_async`, `status: in_progress`) | `POST /activities` | `fa62211e-302e-44d9-a067-6c79049c6ffa` | ✅ |
| Actividad `[TEST-036] Cowork pendiente` (`mode: cowork`) | `POST /activities` | `94faa1f9-a9aa-42d1-9ff5-abe7ec17ff75` | ✅ |
| Actividad `[TEST-036] Sin Claude A` y `[TEST-036] Sin Claude B` (sin `mode`) | `POST /activities` | `7702a6ba-fdfa-4ac1-a8a6-fd83adf1d311`, `b97beba9-5e3b-4e65-afa4-ad44214c758f` | ✅ |
| Actividad `[TEST-036] Autónoma completada` (`mode: autonomous`, `status: completed`) | `POST /activities` | `e38381c9-1823-43f4-a508-2b881d63a322` | ✅ |
| Actividad `[TEST-036] Autónoma diferida` (`mode: autonomous`, `deferUntil` = dentro de 5 días) | `POST /activities` | `8ce0c8cd-e351-47af-a98e-452e251cd071` | ✅ |
| 25+ actividades `[TEST-036] Relleno N` (`mode: autonomous`, estado `pending`, en el proyecto) para forzar paginación (más de 20) | `POST /activities` | 25 ids (`[TEST-036] Relleno 01..25`, ver proyecto) | ✅ |
| Plantilla `[TEST-036] Plantilla recurrente` (`recurrenceFrequency: daily`, `mode: cowork`, en el proyecto) | `POST /activities` | `3eed47ea-dd97-4936-985c-6473757a1744` | ✅ |
| Instancia de mañana de la plantilla (la genera el cron a medianoche; la API de creación no acepta `templateId`/`instanceDate`, así que en una ronda manual se genera con un script que llama a `ActivitiesService.generateInstanceForDate`, el mismo método del cron) | `POST /activities` | `0c9b6253-e479-4b07-883f-0e0000fc6a31` (generada con `ActivitiesService.generateInstanceForDate`, como el cron; la API no permite crearla) | ✅ |
| Actividad `[TEST-036] Autónoma en curso MCP` (`mode: autonomous`, `status: in_progress`) para TC-MCP-036-006 | `POST /activities` | `31909f61-ec43-49cb-97a1-fcc65c18fcb0` | ✅ |
| Actividades creadas desde la UI durante la ronda: `[TEST-036] Creada con modo`, `…cowork async`, `…cowork` y la subtarea `Subtarea sin herencia` | UI (TC-036-001 y 003) | `269dfd83…`, `f7ed5cb2…`, `77ac0207…`, `45ba7960…` | ✅ |

**Entorno de pruebas:** desarrollo — frontend `http://localhost:5173`, backend local `http://localhost:3003/api/v1` conectado a la base de desarrollo en Neon (Postgres 18, `NODE_ENV=test` + `DB_SSL=true` para desactivar el throttler)
**Fecha de la ronda:** 2026-10-14

## Casos de prueba

### TC-036-001 — Crear una actividad con modo desde el formulario
**Precondición:** proyecto `[TEST-036] Proyecto modo` existente.
**Datos de prueba usados:** proyecto `{{id}}`.
**Pasos:**
1. Ir a `/projects/{{id}}` (detalle del proyecto) y pulsar "+ Actividad" para abrir el formulario completo de nueva actividad. (El "Agregar tarea" del Dashboard es un alta rápida solo con nombre y no tiene selector de modo.)
2. Verificar que existe el selector "Modo con Claude" con las opciones "Sin Claude", "Autónomo", "Cowork async" y "Cowork", y que arranca en "Sin Claude".
3. Escribir el nombre `[TEST-036] Creada con modo`, asignar el proyecto y elegir "Autónomo".
4. Guardar.
**Resultado esperado:** la actividad aparece en la lista con un chip "Autónomo" (ícono + etiqueta) junto a prioridad/energía. `GET /activities/:id` devuelve `mode: "autonomous"`. Repetir con "Cowork async" y "Cowork": cada modo muestra su chip con ícono distinto.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** En Dashboard, "Agregar tarea" abre un alta rápida que solo pide el nombre (sin selector de modo); el formulario completo con "Modo con Claude" está en "+ Actividad" del proyecto, en "Nueva subtarea" y en "Editar". El caso se ejecutó desde `/projects/:id`: selector con 4 opciones y arranque en "Sin Claude"; guardadas Autónomo, Cowork async y Cowork (API: `autonomous`, `cowork_async`, `cowork`), cada una con su chip e ícono distinto. Texto del caso corregido (ahora parte de `/projects/:id`). Creadas: `269dfd83…`, `f7ed5cb2…`, `77ac0207…`.

### TC-036-002 — Editar una actividad y dejarla en "Sin Claude"
**Precondición:** actividad `[TEST-036] Autónoma pendiente` con chip "Autónomo" visible.
**Datos de prueba usados:** `{{id}}`.
**Pasos:**
1. Abrir la edición de la actividad.
2. Verificar que el selector llega preseleccionado en "Autónomo".
3. Cambiar a "Sin Claude" y guardar.
**Resultado esperado:** el chip desaparece de la card. `GET /activities/:id` devuelve `mode: null`. Cambiar luego a "Cowork" y guardar muestra el chip "Cowork".
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Edición precargada en "Autónomo"; pasar a "Sin Claude" deja `mode: null` en la API y la card sin chip; luego "Cowork" muestra el chip "Cowork" (verificado en captura). Sin observaciones.

### TC-036-003 — Una subtarea nueva no hereda el modo del padre
**Precondición:** actividad `[TEST-036] Cowork pendiente` (`mode: cowork`).
**Datos de prueba usados:** `{{id}}`.
**Pasos:**
1. Desde la actividad padre, crear una subtarea nueva (`[TEST-036] Subtarea sin herencia`).
2. Verificar el selector "Modo con Claude" del formulario de la subtarea antes de guardar.
3. Guardar sin tocar el modo.
**Resultado esperado:** el selector arranca en "Sin Claude" y la subtarea se guarda sin chip (`mode: null`), aunque el padre tenga modo. El padre conserva su chip.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** La subtarea nueva arranca en "Sin Claude" y se guarda con `mode: null` (padre `94faa1f9…`, que conserva `cowork`). Subtarea creada: `45ba7960…`. Sin observaciones.

### TC-036-004 — Editar el modo de una plantilla recurrente se refleja en la instancia de mañana
**Precondición:** plantilla `[TEST-036] Plantilla recurrente` con `mode: cowork` y su instancia de mañana en `pending` (plantilla por API; instancia generada con el script descrito en la tabla de datos).
**Datos de prueba usados:** plantilla `{{id}}`, instancia `{{id}}`.
**Pasos:**
1. Abrir la edición de la plantilla y cambiar el modo a "Autónomo"; guardar.
2. Consultar la instancia de mañana (vista Mañana o `GET /activities/:id`).
3. Editar de nuevo la plantilla y dejar "Sin Claude"; guardar y volver a consultar la instancia.
**Resultado esperado:** tras el paso 1 la instancia de mañana muestra "Autónomo"; tras el paso 3 queda sin chip (`mode: null`). La instancia de hoy y las completadas (si existen) no cambian.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14; propagación verificada por API, la edición por UI no es alcanzable)
**Hallazgos:** Instancia de mañana (2026-10-15, `pending`) generada con el mismo método que usa el cron. Con `PATCH /activities/:id` sobre la plantilla (misma llamada que haría el formulario): `cowork` → `autonomous` actualiza la instancia a `autonomous`, y `null` la deja en `mode: null`; ambos 200. No pude comprobar "instancia de hoy y completadas no cambian" porque no existen en estos datos. **La parte de UI no se puede ejecutar:** desde spec-034 el frontend no lista plantillas (no envía `includeTemplates` en ningún sitio), así que no hay forma de "abrir la edición de la plantilla" en la pantalla. Registrado en `spec/backlog.md`.

### TC-036-005 — Filtro de modo en Dashboard: badges y paginación coherentes
**Precondición:** actividades con los cuatro valores de modo (incluidas 25+ autónomas de relleno en estado `pending`).
**Datos de prueba usados:** proyecto y actividades de la tabla.
**Pasos:**
1. Ir a `/` y localizar el filtro de modo (`<select>` con label; opciones Todos / Autónomo / Cowork async / Cowork / Sin Claude).
2. Elegir "Autónomo".
3. Observar los badges de conteo de los tabs de estado y la paginación; navegar a la página 2.
4. Volver a "Todos".
**Resultado esperado:** la lista solo muestra actividades autónomas; los badges de los tabs reflejan únicamente las autónomas (coinciden con `GET /activities/summary?mode=autonomous`); la paginación cuenta solo las autónomas (con 25+ hay más de una página y la suma de páginas coincide con el badge); al cambiar el filtro la página vuelve a la 1. Con "Todos" se restauran los conteos globales.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Filtro "Autónomo": badges Activas 28 / Pendientes 27 / En progreso 1 / Completadas 1, iguales a `summary?mode=autonomous` (total 29); paginación "1–20 de 28" y página 2 "21–28 de 28" (8 cards). Al volver a "Todos" (35 activas) regresa a la página 1. Sin observaciones.

### TC-036-006 — Filtro de modo en ProjectDetail
**Precondición:** proyecto `[TEST-036] Proyecto modo` con actividades de varios modos.
**Datos de prueba usados:** proyecto `{{id}}`.
**Pasos:**
1. Ir a `/projects/{{id}}`.
2. Elegir "Cowork async" en el filtro de modo.
3. Observar lista, badges de los tabs y paginación.
4. Con el filtro de modo aún activo, escribir "Relleno" en la búsqueda del proyecto y luego borrar la búsqueda.
**Resultado esperado:** lista, badges y paginación coinciden con las actividades `cowork_async` del proyecto. Mientras se busca, la búsqueda devuelve resultados de cualquier modo (ignora los filtros de estado y modo, igual que ya hacía el de estado) y se muestra el aviso "Los filtros de estado y modo se desactivan mientras buscas."; al borrar la búsqueda desaparece el aviso y se restaura el filtro de modo con su lista y badges. Las estadísticas generales del proyecto (cabecera) no cambian con el filtro.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Caso ajustado el 2026-10-14 (decisión del usuario): la búsqueda ignora el filtro de modo, comportamiento ya existente del filtro de estado. Verificado: con "Cowork async" lista y badges = 2 actividades (Activas 2 / Pendientes 1 / En progreso 1); al buscar "Relleno" salen 25 autónomas con el aviso visible; al borrar la búsqueda vuelven las 2 de "Cowork async" sin aviso. La revisión (`@reviewer`) detectó que "Vencidas" sí cambiaba con el filtro (la cabecera usaba el summary con `mode`); se corrigió en `ProjectDetail.tsx` (summary sin `mode` para cabecera y mensaje de "Limpiar completadas") y se reverificó en el navegador con 2 vencidas de modos distintos: "Vencidas" se mantiene en 2 sin filtro, con "Autónomo" (el tab "Atrasadas" baja a 1) y con "Sin Claude"; "Actividades hoy" y "Esta semana" tampoco cambian. Datos de esa comprobación eliminados.

### TC-036-007 — Combinar el filtro de modo con los tabs de estado
**Precondición:** `[TEST-036] Autónoma pendiente`, `[TEST-036] Autónoma completada` y `[TEST-036] Cowork async en curso` existentes.
**Datos de prueba usados:** `{{ids}}`.
**Pasos:**
1. En Dashboard elegir modo "Autónomo".
2. Cambiar entre los tabs "Activas" y "Completadas" (y otros disponibles).
3. Con el tab "Activas" seleccionado, cambiar el modo a "Cowork async".
**Resultado esperado:** cada combinación muestra solo la intersección modo + estado (por ejemplo "Autónomo" + "Completadas" muestra `[TEST-036] Autónoma completada` y no la pendiente); los badges de cada tab respetan el modo elegido; el cambio de modo no pierde el tab seleccionado.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** "Autónomo" + "Completadas" muestra solo `[TEST-036] Autónoma completada`; "Autónomo" + "Activas" no la incluye; con "Cowork async" se conserva el tab "Activas" y quedan 2 (En curso y Creada con cowork async). Los badges respetan el modo. Sin observaciones.

### TC-036-008 — Filtro "Sin Claude"
**Precondición:** `[TEST-036] Sin Claude A` y `[TEST-036] Sin Claude B` (sin modo) más actividades con modo.
**Datos de prueba usados:** `{{ids}}`.
**Pasos:**
1. En Dashboard elegir "Sin Claude" en el filtro de modo.
2. Revisar la lista, los badges y la paginación.
**Resultado esperado:** solo aparecen actividades con `mode: null` (ninguna card muestra chip); los conteos coinciden con `GET /activities/summary?mode=none`; las actividades con modo no aparecen.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** "Sin Claude": solo `Sin Claude A` y `B`, sin chip; badges Activas 2 / Pendientes 2, iguales a `summary?mode=none` (total 2). La subtarea sin modo no cuenta porque la lista y el resumen son de nivel superior. Sin observaciones.

### TC-036-009 — Dark mode y móvil del chip y del selector
**Precondición:** actividades con los tres modos visibles en la lista.
**Datos de prueba usados:** las de la tabla.
**Pasos:**
1. Activar dark mode y revisar los chips de modo en las cards y el selector del formulario / filtro.
2. Reducir el viewport a ancho móvil (~375 px) y revisar la card con chip + badges de prioridad/energía, el formulario y el filtro de modo.
**Resultado esperado:** en ambos temas el chip es legible (contraste suficiente, borde visible, ícono distinto por modo) y respeta `DESIGN.md`; en móvil no hay desbordes ni solapamientos, el chip no rompe la fila de badges (envuelve correctamente) y el selector/filtro son utilizables con el dedo.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Dark y light: chip con borde visible, texto legible e ícono distinto por modo. Móvil (iframe de 375 px, porque la ventana no baja de ancho): sin desborde horizontal, la fila de badges con el chip cabe, el filtro y el selector del formulario ocupan el ancho. Observación ajena al spec: en 375 px el botón "+ Actividad" del encabezado queda parcialmente cortado. Falta tu revisión visual en un dispositivo/viewport real.

### TC-036-010 — Accesibilidad del selector de modo
**Precondición:** formulario de actividad y filtro de modo accesibles.
**Datos de prueba usados:** ninguno específico.
**Pasos:**
1. Verificar que el selector "Modo con Claude" del formulario y el filtro de modo tienen `<label>` visible y asociado (clic en la etiqueta enfoca el control).
2. Recorrer el formulario solo con teclado (Tab / Shift+Tab) hasta el selector; cambiar la opción con flechas y confirmar.
3. Con un lector de pantalla (o inspeccionando el árbol de accesibilidad) comprobar el nombre accesible del selector y del chip.
**Resultado esperado:** el foco llega al selector en orden lógico con indicador visible; se puede cambiar el valor solo con teclado; el nombre accesible es "Modo con Claude" (y el del filtro es coherente); el chip comunica el modo con texto (no solo con ícono o color).
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** `<label>` asociado en el filtro (`activity-mode-filter`) y en el formulario (`activity-mode`); Tab desde el nombre llega al selector en orden lógico (… prioridad → energía → modo) con anillo de foco visible; nombre accesible "Modo con Claude"; el chip expone `aria-label="Modo con Claude: Autónomo"` más el texto visible. **No verificable por automatización:** cambiar el valor con flechas (en macOS abre el desplegable nativo); comprueba esa parte a mano.

### TC-MCP-036-001 — Crear, actualizar y limpiar `mode` vía MCP
**Herramienta probada:** `create_activity` y `update_activity` en `todo-api`
**Precondición:** proyecto `[TEST-036] Proyecto modo`.
**Input de prueba:**
1. `create_activity { name: "[TEST-036] MCP modo", projectId: "{{id}}", mode: "autonomous" }`
2. `update_activity { id: "<id creado>", mode: "cowork" }`
3. `update_activity { id: "<id creado>", mode: null }`
**Output esperado:** (1) la actividad devuelta trae `mode: "autonomous"`; (2) `mode: "cowork"`; (3) `mode: null`. `get_activity` confirma cada valor.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Verificado por JSON-RPC contra el backend (2026-10-14): `autonomous` → `cowork` → `null`; `get_activity` confirma `null`.

### TC-MCP-036-002 — `create_recurring_activity` con `mode`
**Herramienta probada:** `create_recurring_activity` en `todo-api`
**Precondición:** proyecto de prueba existente.
**Input de prueba:** `create_recurring_activity { name: "[TEST-036] MCP plantilla", projectId: "{{id}}", recurrenceFrequency: "daily", mode: "cowork_async" }`
**Output esperado:** la plantilla devuelta trae `mode: "cowork_async"`. Sin el parámetro `mode` la tool no lo rechaza (`mode: null`).
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Verificado por JSON-RPC: plantilla con `cowork_async`; sin `mode` queda `null` y no se rechaza.

### TC-MCP-036-003 — `get_activities_by_mode`: exclusiones por defecto y `status` explícito
**Herramienta probada:** `get_activities_by_mode` en `todo-api`
**Precondición:** `[TEST-036] Autónoma pendiente`, `[TEST-036] Autónoma completada`, `[TEST-036] Autónoma diferida` y la plantilla recurrente autónoma/cowork existentes en el proyecto de prueba.
**Input de prueba:**
1. `get_activities_by_mode { mode: "autonomous", projectId: "{{id}}" }`
2. `get_activities_by_mode { mode: "autonomous", status: ["completed"], projectId: "{{id}}" }`
3. `get_activities_by_mode { mode: "none", projectId: "{{id}}" }`
**Output esperado:** (1) incluye `[TEST-036] Autónoma pendiente`; NO incluye la completada, la diferida (`deferUntil` futuro) ni plantillas; sí incluye subtareas con ese modo. (2) incluye `[TEST-036] Autónoma completada` y ninguna activa. (3) solo actividades con `mode: null`. La descripción de la tool declara las exclusiones por defecto.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Verificado por JSON-RPC: por defecto excluye completada, diferida y plantillas e incluye subtareas; `status:[completed]` y `mode:none` correctos.

### TC-MCP-036-004 — `byMode` en `get_activities_summary`
**Herramienta probada:** `get_activities_summary` en `todo-api`
**Precondición:** actividades de los cuatro modos en el proyecto de prueba.
**Input de prueba:** `get_activities_summary { projectId: "{{id}}" }` y luego `get_activities_summary { projectId: "{{id}}", mode: "autonomous" }`
**Output esperado:** el primer resultado trae `byMode` con las claves `autonomous`, `cowork_async`, `cowork` y `none` (todas presentes) y la suma de sus valores es igual a `total`. El segundo acota `total` y `byStatus` a las autónomas.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Verificado por JSON-RPC: `byMode` con las 4 claves, suma = `total`, y `mode:autonomous` acota los conteos.

### TC-MCP-036-005 — Rechazo de valores de `mode` inválidos
**Herramienta probada:** `create_activity`, `update_activity`, `get_activities_by_mode` en `todo-api`
**Precondición:** actividad de prueba existente.
**Input de prueba:**
1. `create_activity { name: "[TEST-036] inválida", mode: "AUTONOMOUS" }`
2. `update_activity { id: "{{id}}", mode: "foo" }`
3. `get_activities_by_mode { mode: "foo" }`
**Output esperado:** las tres llamadas son rechazadas por validación (error de parámetros inválidos, `-32602`, o resultado con `isError`) y no se crea ni modifica ninguna actividad. `autonomous` + `status: "waiting"` en `create_activity` sí se acepta.
**Estado:** ✅ Aprobado (confirmado por el usuario, 2026-10-14)
**Hallazgos:** Verificado por JSON-RPC: `foo` rechazado en las tres tools sin modificar nada; `autonomous` + `waiting` aceptado.

### TC-MCP-036-006 — Una tarea autónoma terminada pasa a `testing`
**Herramienta probada:** `get_activities_by_mode` y `update_activity` en `todo-api`, guiados por el system prompt `asistente-personal`
**Precondición:** `[TEST-036] Autónoma en curso MCP` (`mode: autonomous`, `status: in_progress`).
**Input de prueba:** pedir al asistente (con el system prompt actualizado) "¿qué puedes hacer tú solo?", dejar que tome la tarea y que la dé por terminada.
**Output esperado:** el asistente consulta `get_activities_by_mode(autonomous)` y recibe solo trabajo delegable activo; al terminar mueve la tarea a `status: "testing"` (nunca a `completed`) para que Santiago verifique.
**Estado:** ⬜ Pendiente — aplazado a post-despliegue
**Hallazgos:** Aplazado por decisión del usuario (2026-10-14): se ejecuta **después del despliegue**, cuando el MCP de producción ya expone `mode`. Hay que volver a crear el dato `[TEST-036] Autónoma en curso MCP` (`autonomous`, `in_progress`) en ese momento y eliminarlo al terminar.

## Resumen de la ronda
- Aprobados: 15 — Fallidos: 0 — Pendientes: 1 (TC-MCP-036-006, aplazado a después del despliegue: lo prueba el usuario con el asistente)
- Hallazgos escalados a `spec/backlog.md`: plantillas inalcanzables en la UI, instancias no creables por API, throttler activo en `development`, botón "+ Actividad" cortado en móvil
- Limpieza de datos de prueba: ✅ Completada (2026-10-14): proyecto y 39 actividades, incluidas 3 creadas desde la UI, 1 subtarea, la plantilla y su instancia, eliminados por la API; verificado 404 en los 40 IDs y 0 filas en `activities` y `projects`
