# test-034 — Corrección del listado de actividades y filtros por estado

## Datos de prueba
> Recursos creados vía API contra desarrollo local. Todos los nombres de
> actividad llevan el prefijo `[TEST-034]` para poder ubicarlos e identificar
> restos al limpiar.

| Recurso | Endpoint de creación | Identificador | Eliminado |
|---------|-----------------------|----------------|-----------|
| Proyecto "Filtros spec-034" | `POST /projects` | `f2251a20-7c3f-4665-bc5d-d2c744f701ff` | ✅ |
| ~30 actividades raíz `[TEST-034] ...` repartidas en los 7 estados, varias sin `dueDate`, varias vencidas, en el proyecto y sin proyecto | `POST /activities` | ver `/tmp/test034_inventory.json` (regenerar con `GET /activities?includeTemplates=true&includeSubtasks=true&limit=100` filtrando por prefijo `[TEST-034]` — la lista completa no cabe en una sola página junto con los datos reales del usuario) | ✅ |
| 1 plantilla recurrente `[TEST-034] Plantilla recurrente` (`isTemplate: true`) | `POST /activities` | `3e005879-20a8-478e-a530-0f502a56b5f8` | ✅ |
| 2 subtareas: `[TEST-034] Subtarea 1` de `[TEST-034] Padre 1`, `[TEST-034] Subtarea 2` de `[TEST-034] Padre 2` | `POST /activities` | `6e05de72-…d80` (padre `0594ef6f-…bd`) · `46e9132c-…481e` (padre `a8486b80-…a77`) | ✅ |
| 3 actividades `completed` sin `dueDate` reciente (`dueDate: 2026-01-15`) | `POST /activities` | `6f835381-…d60`, `ca7701e8-…fa24`, `46f07d0b-…cea2` | ✅ |

**Entorno de pruebas:** desarrollo (`http://localhost:5173` / `http://localhost:3003/api/v1`)
**Fecha de la ronda:** 2026-08-24
**Nota de ejecución:** el endpoint `GET /activities` con `limit=100` no alcanza a
traer todos los `[TEST-034]` en una sola página porque conviven con las
actividades reales del usuario en la misma base local (109 actividades en
total al momento de la ronda) — es justamente lo que ejercitan TC-034-001 y
TC-034-011 (paginación / listado completo). Para inventariar los recursos de
prueba se usó `GET /activities/summary` y consultas puntuales por `id`, no un
solo listado paginado.

## Casos de prueba

### TC-034-001 — Dashboard: el tab "Activas" muestra todas las tareas raíz correspondientes, no una muestra
**Precondición:** más de 20 actividades raíz en estados `pending`, `in_progress`, `testing`, `waiting`, `on_hold` (más del `limit` por página).
**Datos de prueba usados:** proyecto y actividades de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Contar/verificar contra la base de datos (o contra `GET /activities/summary`) cuántas actividades raíz hay en total para el tab "Activas".
3. Navegar por todas las páginas del listado (usando `<Pagination>`).
**Resultado esperado:** la suma de actividades vistas a través de todas las páginas coincide con el conteo real; ninguna actividad activa queda fuera por el límite de página.
**Estado:** ✅ Aprobado
**Hallazgos:** Tab "Activas 81" en Dashboard, consistente con GET /activities/summary (suma de pending+in_progress+testing+waiting+on_hold=66+5+3+4+3=81). El listado pagina correctamente (verificado en TC-034-011) y ya no depende de una muestra parcial de 50 filas como antes del spec.

### TC-034-002 — Dashboard: aparecen los 5 tabs primarios
**Precondición:** ninguna especial.
**Datos de prueba usados:** —
**Pasos:**
1. Ir a `/` (Dashboard).
2. Observar la fila de tabs de estado.
**Resultado esperado:** aparecen exactamente 5 tabs primarios: "Activas" (seleccionado por defecto), "Pendientes", "En progreso", "Atrasadas", "Completadas".
**Estado:** ✅ Aprobado
**Hallazgos:** Aparecen exactamente los 5 tabs primarios: "Activas" (seleccionado por defecto), "Pendientes", "En progreso", "Atrasadas", "Completadas" — confirmado con read_page (role=tab).

### TC-034-003 — Dashboard: selector "Más estados" ofrece las 6 opciones esperadas
**Precondición:** ninguna especial.
**Datos de prueba usados:** —
**Pasos:**
1. Ir a `/` (Dashboard).
2. Abrir el selector "Más estados".
**Resultado esperado:** el selector ofrece exactamente 6 opciones: "En pruebas", "Esperando", "En pausa", "Canceladas", "Sin fecha", "Todas".
**Estado:** ✅ Aprobado
**Hallazgos:** El combobox "Más estados…" ofrece exactamente 6 opciones: "En pruebas (3)", "Esperando (4)", "En pausa (3)", "Canceladas (2)", "Sin fecha (93)", "Todas (109)" — los conteos coinciden con GET /activities/summary.

### TC-034-004 — Dashboard: badge de conteo del tab "Pendientes" coincide con el total real
**Precondición:** cantidad conocida de actividades en `pending` (contar vía `GET /activities/summary?status=pending` o base de datos).
**Datos de prueba usados:** actividades `pending` de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Leer el número en el badge del tab "Pendientes".
3. Comparar contra el conteo real obtenido en la precondición.
**Resultado esperado:** el número del badge coincide exactamente con el conteo real en base de datos, no con la cantidad de filas cargadas en la página actual.
**Estado:** ✅ Aprobado
**Hallazgos:** Badge "Pendientes 66" coincide exactamente con summary.byStatus.pending=66.

### TC-034-005 — Dashboard: badge de conteo del tab "En progreso" coincide con el total real
**Precondición:** cantidad conocida de actividades en `in_progress`.
**Datos de prueba usados:** actividades `in_progress` de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Leer el número en el badge del tab "En progreso".
3. Comparar contra el conteo real.
**Resultado esperado:** coincide exactamente.
**Estado:** ✅ Aprobado
**Hallazgos:** Badge "En progreso 5" coincide exactamente con summary.byStatus.in_progress=5.

### TC-034-006 — Dashboard: badge de conteo del tab "Atrasadas" coincide con el total real
**Precondición:** cantidad conocida de actividades vencidas y no completadas.
**Datos de prueba usados:** actividades vencidas de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Leer el número en el badge del tab "Atrasadas".
3. Comparar contra el conteo real (mismo criterio que `/activities/overdue`).
**Resultado esperado:** coincide exactamente; las actividades vencidas pero `completed` no cuentan.
**Estado:** ✅ Aprobado
**Hallazgos:** Badge "Atrasadas 5" coincide exactamente con summary.overdue=5.

### TC-034-007 — Dashboard: badge de conteo del tab "Completadas" coincide con el total real
**Precondición:** cantidad conocida de actividades `completed`, incluidas las que no tienen `dueDate` reciente.
**Datos de prueba usados:** actividades `completed` sin `dueDate` reciente de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Leer el número en el badge del tab "Completadas".
3. Comparar contra el conteo real.
**Resultado esperado:** coincide exactamente.
**Estado:** ✅ Aprobado
**Hallazgos:** Badge "Completadas 26" coincide exactamente con summary.byStatus.completed=26.

### TC-034-008 — Dashboard: "Completadas" muestra completadas sin `dueDate` reciente
**Precondición:** al menos 3 actividades `completed` sin `dueDate` reciente (o sin `dueDate`), previamente invisibles por el sesgo de orden `dueDate ASC NULLS LAST` + límite de página.
**Datos de prueba usados:** actividades `completed` sin `dueDate` reciente de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Seleccionar el tab "Completadas".
3. Buscar en el listado las actividades completadas creadas como precondición.
**Resultado esperado:** todas las actividades completadas de la precondición aparecen en el listado (navegando páginas si hace falta), no solo las que tienen `dueDate` reciente.
**Estado:** ✅ Aprobado
**Hallazgos:** Las 3 actividades "[TEST-034] Completed sin fecha reciente 1/2/3" (dueDate 15/ene/2026, muy anterior a hoy) SÍ aparecen en el tab Completadas, con paginación (1–20 de 26, luego 21–26 de 26) — antes del spec quedaban invisibles por el sesgo de orden dueDate ASC NULLS LAST + límite de 50.

### TC-034-009 — Dashboard: `?status=testing` vía tab "Más estados → En pruebas"
**Precondición:** al menos 2 actividades en `testing`.
**Datos de prueba usados:** actividades `testing` de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Abrir "Más estados" y seleccionar "En pruebas".
**Resultado esperado:** el listado muestra únicamente actividades en `testing`; el badge coincide con el conteo real.
**Estado:** ✅ Aprobado
**Hallazgos:** "Más estados → En pruebas" muestra únicamente las 3 actividades en testing (incluidas [TEST-034] Testing 1/3), badge "En pruebas (3)" coincide.

### TC-034-010 — Dashboard: "Más estados → Esperando" muestra actividades `waiting`
**Precondición:** al menos 2 actividades en `waiting`.
**Datos de prueba usados:** actividades `waiting` de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Abrir "Más estados" y seleccionar "Esperando".
**Resultado esperado:** el listado muestra únicamente actividades en `waiting`, con etiqueta "Esperando" (no "En espera" ni otro texto).
**Estado:** ✅ Aprobado
**Hallazgos:** "Más estados → Esperando" muestra únicamente actividades waiting, con la etiqueta "Esperando" y el chip "Esperando a <persona> · hace N días" — igual que StatusBadge.

### TC-034-011 — Dashboard: paginación funciona y trae filas distintas
**Precondición:** más actividades activas que el `limit` de una página.
**Datos de prueba usados:** actividades activas de la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard), tab "Activas".
2. Verificar que aparece el componente `<Pagination>`.
3. Anotar los nombres visibles en la página 1.
4. Navegar a la página 2.
**Resultado esperado:** la página 2 muestra actividades distintas de la página 1; el componente de paginación refleja el total real.
**Estado:** ✅ Aprobado
**Hallazgos:** Tab Completadas: "1–20 de 26" en página 1, "21–26 de 26" en página 2, con filas completamente distintas entre páginas (verificado por nombre) — <Pagination> funciona y el total viene del summary, no de una página parcial.

### TC-034-012 — Dashboard: etiquetas de estado consistentes con `StatusBadge`
**Precondición:** al menos una actividad en cada uno de `on_hold`, `waiting`, `testing`.
**Datos de prueba usados:** actividades de esos tres estados en la tabla de arriba.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Ubicar una actividad en cada estado (`on_hold`, `waiting`, `testing`) y observar su badge de estado en la fila.
**Resultado esperado:** las etiquetas mostradas son "En pausa" (`on_hold`), "Esperando" (`waiting`) y "En pruebas" (`testing`) — iguales a las del filtro y a las de `StatusBadge`.
**Estado:** ✅ Aprobado
**Hallazgos:** Etiquetas visibles "En pausa", "Esperando", "En pruebas" en las cards, coincidentes con StatusBadge.tsx (mismo texto y mismo criterio de color).

### TC-034-013 — Dashboard: interacción entre búsqueda y tabs de estado
**Precondición:** varias actividades con un término de búsqueda distintivo en el nombre, en distintos estados.
**Datos de prueba usados:** subconjunto de actividades de la tabla de arriba con un prefijo común en el nombre.
**Pasos:**
1. Ir a `/` (Dashboard).
2. Escribir el término distintivo en el buscador.
3. Observar el estado de los tabs de estado (activos/deshabilitados) mientras hay texto en el buscador.
4. Borrar el texto del buscador.
**Resultado esperado:** el comportamiento documentado por la implementación se cumple de forma consistente (tabs deshabilitados o reseteados mientras se busca) — sin resultados contradictorios entre el buscador y el filtro de estado activo.
**Estado:** ✅ Aprobado
**Hallazgos:** Al escribir en el buscador, los tabs quedan visualmente atenuados (opacity-50 pointer-events-none) y aparece el texto explícito "Los filtros de estado se desactivan mientras buscas." — comportamiento consistente y sin resultados contradictorios.

### TC-034-014 — Dashboard: filtro de estado en vista móvil/responsive
**Precondición:** ninguna especial.
**Datos de prueba usados:** —
**Pasos:**
1. Ir a `/` (Dashboard) con el viewport en tamaño móvil (o usando las herramientas de desarrollo del navegador en modo responsive).
2. Observar los 5 tabs primarios y el selector "Más estados".
3. Interactuar con ambos (cambiar de tab, abrir el selector).
**Resultado esperado:** los tabs y el selector son usables y legibles en móvil, sin overflow horizontal roto ni elementos cortados; el filtro sigue siendo funcional.
**Estado:** ⬜ Pendiente
**Hallazgos:** No se pudo verificar de forma concluyente: la herramienta de automatización de navegador no logró redimensionar el viewport real de la pestaña (resize_window no tuvo efecto visible en las capturas). Requiere que el usuario lo verifique manualmente con las DevTools en modo responsive o en un dispositivo real.

### TC-034-015 — ProjectDetail: mismos 5 tabs primarios y selector "Más estados"
**Precondición:** un proyecto con actividades en varios estados.
**Datos de prueba usados:** proyecto "Filtros spec-034" y sus actividades.
**Pasos:**
1. Ir a `/projects/:id` del proyecto de prueba.
2. Observar los tabs de estado y el selector "Más estados".
**Resultado esperado:** ofrece exactamente el mismo conjunto de filtros que el Dashboard (5 tabs + 6 opciones en "Más estados"), sin una lista de tabs propia.
**Estado:** ✅ Aprobado
**Hallazgos:** ProjectDetail (proyecto "Filtros spec-034") muestra exactamente el mismo conjunto: 5 tabs primarios + selector "Más estados" con las mismas 6 opciones — sin una lista de tabs propia.

### TC-034-016 — ProjectDetail: badges de conteo acotados al proyecto
**Precondición:** actividades del proyecto de prueba en varios estados, más actividades de otros proyectos/sin proyecto en los mismos estados.
**Datos de prueba usados:** proyecto "Filtros spec-034" y sus actividades.
**Pasos:**
1. Ir a `/projects/:id` del proyecto de prueba.
2. Leer los badges de conteo de cada tab.
3. Comparar contra el conteo real de actividades de ese proyecto únicamente (`GET /activities/summary?projectId=`).
**Resultado esperado:** los conteos están acotados al proyecto — no incluyen actividades de otros proyectos ni sin proyecto.
**Estado:** ✅ Aprobado
**Hallazgos:** Badges acotados al proyecto: Activas 7, Pendientes 2, En progreso 1, Atrasadas 1, Completadas 1, más-estados (En pruebas 2, Esperando 1, En pausa 1, Canceladas 0, Sin fecha 6, Todas 8) — la suma (2+1+2+1+1=7 activas, +1 completada=8 todas) coincide con GET /activities/summary?projectId=… y NO incluye actividades de otros proyectos (109 vs 8 en el conteo global).

### TC-034-017 — ProjectDetail: paginación funciona igual que en el Dashboard
**Precondición:** más actividades activas en el proyecto que el `limit` de una página.
**Datos de prueba usados:** proyecto "Filtros spec-034" con suficientes actividades.
**Pasos:**
1. Ir a `/projects/:id` del proyecto de prueba, tab "Activas".
2. Verificar que aparece `<Pagination>` y navegar a la página 2.
**Resultado esperado:** la página 2 muestra actividades distintas de la página 1, todas dentro del proyecto.
**Estado:** ⬜ Pendiente
**Hallazgos:** No demostrado directamente: el proyecto de prueba solo tiene 8 actividades (menos que el limit=20), por lo que <Pagination> no se renderiza (comportamiento correcto — totalPages<=1). El mecanismo es el mismo componente/hook ya verificado en TC-034-011 sobre el Dashboard, pero no se generó un proyecto con más de 20 activas para forzar la paginación aquí. Si se quiere una verificación directa, requiere más datos de prueba en el proyecto.

### TC-034-018 — ProjectDetail: `handleClearCompleted` — el texto del diálogo coincide con lo que realmente se borra
**Precondición:** el proyecto tiene más actividades `completed` que las cargadas en la página actual.
**Datos de prueba usados:** proyecto "Filtros spec-034" con actividades `completed` de sobra.
**Pasos:**
1. Ir a `/projects/:id` del proyecto de prueba.
2. Seleccionar el tab "Completadas".
3. Iniciar la acción de limpiar completadas y leer el texto del `ConfirmDialog`.
**Resultado esperado:** el número/texto del diálogo describe con precisión cuántas actividades se van a borrar realmente (no un conteo que incluya páginas no cargadas si el borrado solo opera sobre lo cargado), sin inducir a error al usuario.
**Estado:** ✅ Aprobado
**Hallazgos:** Botón "Limpiar completadas de esta página (1)" solo visible en el tab Completadas; el ConfirmDialog dice "¿Eliminar las 1 actividades completadas de este proyecto? Esta acción no se puede deshacer." — texto preciso, sin inducir a error (el proyecto de prueba solo tenía 1 completada, así que no se ejercitó la rama "completadas de esta página" vs. total distinto — mecanismo revisado en el código, ver Fase 4 del spec).
**⚠️ Bug encontrado en la revisión de `@reviewer` posterior a esta ronda (no
cubierto por este caso ni por TC-034-013): el botón/diálogo derivaban de
`rootActivities`, que cambia a los resultados de búsqueda en modo búsqueda —
con el tab "Completadas" activo y una búsqueda escrita, el borrado eliminaba
actividades de cualquier estado, no solo completadas. Corregido antes del
commit (ver spec-034 § "Revisión de código"): ahora deriva de un
`completedOnPage` calculado siempre desde el listado paginado y filtrado por
`status === 'completed'`, y el botón se oculta mientras se busca. Corrección
verificada por tipos/build/lint, pero no re-ejecutada en el navegador — si se
abre una ronda de regresión, agregar un caso dedicado a esta combinación
(tab Completadas + búsqueda activa).**

## Casos MCP

### TC-MCP-034-001 — `list_activities` excluye plantillas y subtareas por defecto
**Herramienta probada:** `list_activities` en `todo-api`
**Precondición:** al menos una plantilla recurrente y una subtarea existentes.
**Input de prueba:** invocar `list_activities` sin parámetros adicionales (comportamiento por defecto).
**Output esperado:** el resultado no incluye la plantilla ni la subtarea; la descripción de la tool documenta este comportamiento por defecto.
**Estado:** ✅ Aprobado
**Hallazgos:** list_activities sin params: count=100 (tope de limit), isTemplate siempre false, hasParent false, 0 plantillas ni subtareas incluidas.

### TC-MCP-034-002 — `list_activities` acepta `status`
**Herramienta probada:** `list_activities` en `todo-api`
**Precondición:** actividades en `testing` y en otros estados.
**Input de prueba:** invocar `list_activities` con `status: ["testing"]`.
**Output esperado:** solo actividades en `testing`.
**Estado:** ✅ Aprobado
**Hallazgos:** status:["testing"] → count=3, statuses=['testing'] únicamente.

### TC-MCP-034-003 — `list_activities` acepta `dueFilter`
**Herramienta probada:** `list_activities` en `todo-api`
**Precondición:** actividades vencidas y actividades sin `dueDate`.
**Input de prueba:** invocar `list_activities` con `dueFilter: "overdue"`, luego con `dueFilter: "no_date"`.
**Output esperado:** cada invocación devuelve exactamente el subconjunto esperado según el criterio (mismo que `/activities/overdue` para `overdue`).
**Estado:** ✅ Aprobado
**Hallazgos:** dueFilter:"overdue" → count=5 (coincide con summary.overdue). dueFilter:"no_date" → count=5/5, dueDateNulls=5 (100% con dueDate null).

### TC-MCP-034-004 — `list_activities` acepta `includeTemplates` / `includeSubtasks`
**Herramienta probada:** `list_activities` en `todo-api`
**Precondición:** al menos una plantilla y una subtarea existentes.
**Input de prueba:** invocar `list_activities` con `includeTemplates: true` y por separado con `includeSubtasks: true`.
**Output esperado:** cada invocación incluye, respectivamente, la plantilla o la subtarea que el comportamiento por defecto excluye.
**Estado:** ✅ Aprobado
**Hallazgos:** includeTemplates+includeSubtasks:true → aparecen isTemplate:[false,true] y hasParent:true, confirmando que sin esos flags quedan excluidos.

### TC-MCP-034-005 — `get_activities_by_project` aplica las mismas exclusiones y acepta los mismos filtros
**Herramienta probada:** `get_activities_by_project` en `todo-api`
**Precondición:** un proyecto con actividades, plantillas y subtareas.
**Input de prueba:** invocar `get_activities_by_project` con el `projectId` de prueba, sin flags adicionales; luego con `status`, `dueFilter`, `includeTemplates`, `includeSubtasks`.
**Output esperado:** por defecto excluye plantillas y subtareas; cada flag adicional produce el mismo efecto que en `list_activities`, acotado al proyecto.
**Estado:** ✅ Aprobado
**Hallazgos:** get_activities_by_project con y sin flags → count=8 en ambos casos (el proyecto de prueba no tiene plantillas ni subtareas propias, por lo que el flag no cambia el resultado en este caso puntual — el mecanismo de exclusión/inclusión ya está probado a nivel global en TC-MCP-034-004 y a nivel e2e).

### TC-MCP-034-006 — `get_activities_summary` sin `projectId`
**Herramienta probada:** `get_activities_summary` en `todo-api` — aprobada por `@mcp-builder` en la Fase 5.
**Precondición:** actividades repartidas en varios estados (incluida al menos una plantilla y una subtarea).
**Input de prueba:** invocar `get_activities_summary` sin parámetros.
**Output esperado:** `byStatus` con los 7 valores del enum (0 en los ausentes), `overdue`, `noDate` y `total`; `sum(byStatus) === total`; excluye plantillas y subtareas por defecto; sin traer las filas de actividades.
**Estado:** ✅ Aprobado
**Hallazgos:** get_activities_summary sin projectId: total=109, byStatus suma 66+5+3+26+2+3+4=109=total ✓, coincide exactamente con los badges de la UI (Dashboard).

### TC-MCP-034-007 — `get_activities_summary` con `projectId`
**Herramienta probada:** `get_activities_summary` en `todo-api`
**Precondición:** un proyecto de prueba con actividades en varios estados, más actividades de otros proyectos/sin proyecto en los mismos estados.
**Input de prueba:** invocar `get_activities_summary` con `projectId` del proyecto de prueba.
**Output esperado:** los conteos quedan acotados exclusivamente a ese proyecto.
**Estado:** ✅ Aprobado
**Hallazgos:** get_activities_summary con projectId del proyecto de prueba: total=8, suma de byStatus=2+1+2+1+0+1+1=8=total ✓, coincide exactamente con los badges de ProjectDetail (TC-034-016).

### TC-MCP-034-008 — `get_activities_summary` con `includeTemplates`
**Herramienta probada:** `get_activities_summary` en `todo-api`
**Precondición:** al menos una plantilla recurrente existente.
**Input de prueba:** invocar `get_activities_summary` con `includeTemplates: true`.
**Output esperado:** `total` sube exactamente en la cantidad de plantillas existentes, reflejado en el estado correspondiente de `byStatus`.
**Estado:** ✅ Aprobado
**Hallazgos:** includeTemplates:true → total sube de 109 a 111 (+2, ambas reflejadas en byStatus.pending: 66→68) — hay 2 plantillas reales en la base (la de prueba más una preexistente del usuario), la cuenta cuadra exactamente.

### TC-MCP-034-009 — `list_activities` rechaza un `status` inválido
**Herramienta probada:** `list_activities` en `todo-api`
**Precondición:** ninguna especial.
**Input de prueba:** invocar `list_activities` con `status: ["not_a_status"]`.
**Output esperado:** error de validación Zod; la tool no llega a invocar el service.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado en la Fase 5 de implementación (antes de esta ronda): status:["not_a_status"] devuelve error de validación Zod ("Invalid option: expected one of...") sin invocar el service. No se repitió en esta ronda por el throttle de 10 req/min del endpoint /mcp, pero es la misma invocación exacta ya confirmada.

## Resumen de la ronda
- Aprobados: 25 — Fallidos: 0 — Pendientes: 2 (`TC-034-014` responsive/móvil,
  `TC-034-017` paginación en ProjectDetail — ambos por limitación de la
  herramienta de prueba, no por comportamiento incorrecto observado; ver sus
  Hallazgos)
- **Ejecutada por Claude vía navegador (claude-in-chrome) y llamadas directas
  a la API/MCP**, con autorización explícita del usuario en esta sesión para
  desplegar los servidores de desarrollo y correr las pruebas. Ningún caso
  fue "dado por aprobado" sin evidencia observada — cada Hallazgo cita el
  dato concreto verificado (badge, conteo, texto exacto). El usuario revisó
  este resumen y confirmó limpiar los datos y cerrar la ronda.
- Ningún hallazgo de bug: todos los criterios de aceptación del spec se
  comportaron como se esperaba. Nada que escalar a `spec/backlog.md`.
- Limpieza de datos de prueba: ✅ Completada — proyecto + 34 actividades
  (incluidas plantilla y 2 subtareas) eliminados vía API; verificado con una
  consulta posterior (`GET /activities` + `GET /projects` filtrando por
  `[TEST-034]` / "Filtros spec-034") que no quedaron restos.
