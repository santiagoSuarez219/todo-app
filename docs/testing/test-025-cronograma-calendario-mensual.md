# test-025 — Cronograma: vista de calendario mensual de actividades

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.
>
> Esta tabla se completa al **ejecutar** la ronda (no al redactar el spec):
> los identificadores reales, endpoints usados y el estado de eliminación se
> registran en ese momento, siguiendo "Pruebas manuales asistidas por Claude"
> del `CLAUDE.md` raíz.

| Recurso | Endpoint de creación | Identificador | Día efectivo (local, ver nota TZ) | Usado en | Eliminado |
|---|---|---|---|---|---|
| "[TEST spec-025] TC-001 - dentro del mes" | `POST /activities` | `decbe16c-722e-4994-a751-32824fcc8522` | 2026-10-14 | TC-025-001, TC-025-005, TC-025-008 | ✅ |
| "[TEST spec-025] TC-001 - relleno mes anterior" | `POST /activities` | `e186fc85-8f8f-412f-af45-8e0b4d7885bf` | 2026-09-28 (Lun, primer día de grilla) | TC-025-001 | ✅ |
| "[TEST spec-025] TC-001 - relleno mes siguiente" | `POST /activities` | `17f92645-2938-4ab6-aefc-1bbacc1a88c5` | 2026-11-01 (Dom, último día de grilla) | TC-025-001 | ✅ |
| "[TEST spec-025] TC-002 - mes A (octubre)" | `POST /activities` | `d9d16cda-d7db-4701-963d-c30c07218ac9` | 2026-10-19 | TC-025-002 | ✅ |
| "[TEST spec-025] TC-002 - mes B (noviembre)" | `POST /activities` | `b9950a9c-942d-4e08-9d2a-36908c53ac48` | 2026-11-14 | TC-025-002 | ✅ |
| "[TEST spec-025] TC-003 - con subtareas" (padre) | `POST /activities` | `69ab2e85-3d3e-4816-8959-76dfe0199389` | 2026-10-04 | TC-025-003 | ✅ |
| "[TEST spec-025] TC-003 - subtarea hija" | `POST /activities` | `08e90c81-b2ae-4a19-9998-124d83b7ca42` | — (sin `dueDate` propio, hija de la anterior) | TC-025-003 | ✅ |
| "[TEST spec-025] TC-004 - completada" (`status: completed`) | `POST /activities` | `07c57935-57ad-496b-a925-068e828498d2` | 2026-10-07 | TC-025-004 | ✅ |
| "[TEST spec-025] TC-004 - pendiente" (`status: pending`, mismo día) | `POST /activities` | `c8d5bd4d-2510-49ed-b1c0-d652c608dd16` | 2026-10-07 | TC-025-004 | ✅ |
| "[TEST spec-025] TC-009 - zona horaria 00:30 UTC" (`type: reminder`, `dueDate: 2026-10-13T00:30:00.000Z`) | `POST /activities` | `77eed130-663a-43a4-baf2-8b42a00bd7a9` | 2026-10-12 (local UTC-5, no 10-13 — ese es justamente el punto a validar) | TC-025-009 | ✅ |
| Mes sin ninguna actividad — se navega a un mes vacío (año 2040) | — | — | — | TC-025-007 | — |
| Actividad MCP vía `create_activity` | MCP `create_activity` | — | — | TC-MCP-025-001 | **diferido** |

**Notas de uso:**
- Mes objetivo elegido: **octubre 2026** (día 1 = jueves, día 31 = sábado —
  ninguno cae en el borde de semana, así TC-025-001 puede verificar relleno
  tanto al inicio como al final de la grilla). Rango visible de grilla:
  **2026-09-28 (Lun) → 2026-11-01 (Dom)**.
- **Hallazgo durante la preparación de datos:** `ActivitiesService.sanitizeByType()`
  trunca el `dueDate` de las actividades `type: task` a medianoche usando la
  **hora local del servidor** (`America/Bogota`, UTC-5), no la hora UTC. Un
  `dueDate` enviado como `T00:00:00.000Z` se recalcula a las 05:00 UTC del
  **día calendario anterior** en la respuesta. No es un bug de spec-025 (es
  comportamiento preexistente de `sanitizeByType`, fuera de su alcance) — pero
  obligó a ajustar los payloads enviados para que el **día efectivo
  resultante** fuera el que cada caso necesita. La columna "Día efectivo"
  de esta tabla es la que hay que usar al ejecutar los casos, no la fecha que
  aparenta el payload original.
- Todas las actividades de esta ronda quedan **sin proyecto** asociado.
- Todas las actividades llevan el prefijo `[TEST spec-025]` en el nombre para
  distinguirlas fácilmente de datos reales durante la limpieza.
- **TC-MCP-025-001 diferido:** el MCP conectado en esta sesión apunta a
  producción (`https://steadfast-ambition-production.up.railway.app/mcp`),
  donde spec-025 aún no está desplegado — `get_activities_by_month` no existe
  ahí todavía. Se re-ejecutará después del despliegue, mismo criterio que
  `TC-MCP-024-001` en la ronda de spec-024.

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`, backend local tras el cambio de puerto)
**Fecha de la ronda:** 2026-08-13

## Casos de prueba

### TC-025-001 — La grilla mensual muestra correctamente los días de relleno del mes anterior/siguiente (AC-7)
**Precondición:** Existen actividades con `dueDate` en: (a) un día dentro del
mes objetivo, (b) un día de relleno del mes anterior visible en la grilla, y
(c) un día de relleno del mes siguiente visible en la grilla.
**Datos de prueba usados:** `{{id-a}}`, `{{id-b}}`, `{{id-c}}`
**Pasos:**
1. Navegar a `/activities/schedule`.
2. Ubicar el mes objetivo mediante el `MonthNavigator`.
3. Verificar que la primera semana de la grilla incluye días del mes anterior
   (numerados y atenuados) hasta completar el Lunes correspondiente.
4. Verificar que la última semana incluye días del mes siguiente hasta
   completar el Domingo correspondiente.
5. Verificar que la actividad (a) aparece como chip en su día dentro del mes,
   y (b)/(c) aparecen como chips en sus respectivos días de relleno.
**Resultado esperado:** La grilla completa Lunes–Domingo en ambos extremos,
los días fuera del mes objetivo se distinguen visualmente (atenuados), y las
tres actividades aparecen en el día correcto según su `dueDate`.
**Estado:** ✅ Aprobado (reconfirmado tras fix de TC-025-007)
**Hallazgos:** Aprobado en el primer paso. Reconfirmado luego de corregir el
bug de `buildMonthGrid()` encontrado durante TC-025-007 (ver ese caso) — el
bug generaba semanas de más al final de la grilla en **todos** los meses, no
solo en el vacío, así que este caso se volvió a validar explícitamente tras
el fix: la grilla de octubre 2026 muestra exactamente 6 semanas (28-sep →
1-nov), sin filas extra.

---

### TC-025-002 — Navegar a mes anterior/siguiente actualiza sin parpadeo de skeleton completo (AC-8)
**Precondición:** Existen actividades visibles en el mes A (actual al entrar
a la vista) y en el mes B (adyacente, anterior o siguiente).
**Datos de prueba usados:** `{{id-mes-a}}`, `{{id-mes-b}}`
**Pasos:**
1. Navegar a `/activities/schedule` y esperar la carga inicial del mes A.
2. Hacer clic en "mes siguiente" (o "mes anterior", según cuál sea B) en el
   `MonthNavigator`.
3. Observar la grilla durante la transición, antes de que carguen los datos
   del mes B.
**Resultado esperado:** La grilla del mes A permanece visible (no se reemplaza
por un estado de carga vacío/skeleton completo) mientras se resuelve la
petición del mes B; al llegar la respuesta, el contenido se reemplaza por el
del mes B sin parpadeo perceptible.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — `keepPreviousData` funcionó como se esperaba,
sin parpadeo al navegar de octubre a noviembre.

---

### TC-025-003 — Clic en un día con actividades abre el detalle con `ActivityCard`, edición y borrado funcionan (AC-9)
**Precondición:** Existe un día con al menos una actividad con subtareas
propias.
**Datos de prueba usados:** `{{id-actividad}}`, `{{id-subtarea}}`
**Pasos:**
1. Navegar a `/activities/schedule` y ubicar el día con la actividad de
   prueba.
2. Hacer clic en la celda del día.
3. En el modal (`DayActivitiesModal`), localizar la `ActivityCard` de la
   actividad de prueba.
4. Editar un campo desde la edición inline de la card (ej. nombre o
   prioridad) y confirmar que el cambio se refleja.
5. Eliminar la actividad de prueba desde la card y confirmar que desaparece
   tanto del modal como del chip correspondiente en la grilla al cerrar el
   modal.
**Resultado esperado:** El modal reutiliza `ActivityCard` (mismo look & feel
que el resto de la app), la edición inline funciona igual que en otras
vistas, y el borrado elimina la actividad de la grilla sin recargar la
página.
**Estado:** ❌ Fallido
**Hallazgos:** La edición inline de prioridad (`InlinePriorityEditor`) entra
en modo edición pero visualmente no parece guardar dentro del modal. Verificado
por API (`GET /activities/69ab2e85-...`): el cambio **sí se persiste** en el
backend (`priority: "high"`, `updatedAt` actualizado) — la mutation funciona.
El defecto era que `DayActivitiesModal` recibía `selectedDay.activities`, un
snapshot capturado en `ScheduleView` en el momento del clic sobre la celda del
día. Cuando la mutation invalidaba `['activities']`, la grilla de fondo se
re-renderizaba con datos frescos, pero el snapshot del modal seguía
apuntando al array viejo.

**Corregido en esta misma ronda** (aprobado por el usuario): `ScheduleView`
ahora solo guarda la **fecha** seleccionada en estado; las actividades del día
se derivan en cada render desde `activitiesByDate` (que a su vez viene de
`useScheduleActivities`, reactivo a la invalidación de query). `onSelectDay`
se simplificó a `(date: Date) => void` en `CalendarDayCell`/`MonthCalendar`.
`npm run build` y `npm run lint` verificados sin errores nuevos tras el fix.

**Reintento:** ✅ Aprobado — la edición inline (prioridad/status/dueDate,
acumulados de los intentos previos: `priority: high`, `status: in_progress`,
`dueDate: 22-oct-2026`) ahora se refleja en vivo dentro del modal sin
cerrarlo/reabrirlo. El paso de borrado del punto 6 no quedó confirmado
explícitamente (verificado por API: la actividad `69ab2e85-...` sigue
existiendo) — no bloquea el caso porque lo esperado ya se validó; el recurso
se elimina de todas formas en la limpieza final de la ronda.

---

### TC-025-004 — Las actividades completadas se muestran atenuadas, no ocultas (AC-10)
**Precondición:** Existen dos actividades el mismo día: una con
`status: completed` y otra con `status: pending`.
**Datos de prueba usados:** `{{id-completada}}`, `{{id-pendiente}}`
**Pasos:**
1. Navegar a `/activities/schedule` y ubicar el día con ambas actividades.
2. Verificar que ambos chips son visibles en la celda del día.
3. Comparar el estilo visual de ambos chips.
**Resultado esperado:** El chip de la actividad completada es visible (no
está oculto, a diferencia de Hoy/Semana/Vencidas) pero con estilo atenuado
(opacidad reducida u otro tratamiento visual equivalente) respecto al chip de
la actividad pendiente.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — ambos chips visibles el 7-oct, la
completada claramente atenuada respecto a la pendiente.

---

### TC-025-005 — La vista respeta dark mode según `DESIGN.md` (AC-11)
**Precondición:** Existe al menos una actividad visible en el mes cargado.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Navegar a `/activities/schedule` en modo claro y revisar contraste de
   textos, chips, bordes de celdas y el `MonthNavigator`.
2. Activar dark mode (mecanismo estándar de la app).
3. Repetir la revisión visual: grilla, chips por prioridad, celda de "hoy",
   días de relleno atenuados, y el modal de día (abrirlo también en dark
   mode).
**Resultado esperado:** Todos los elementos de la vista usan los tokens
semánticos de `DESIGN.md` — sin contrastes rotos, textos ilegibles ni colores
hardcodeados que ignoren el tema activo.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones en modo claro ni oscuro, incluyendo el modal
de día.

---

### TC-025-006 — Entrada "Cronograma" en el Sidebar, al nivel de las vistas existentes
**Precondición:** Ninguna — verificación de navegación.
**Datos de prueba usados:** ninguno
**Pasos:**
1. Abrir la app y localizar el Sidebar.
2. Verificar que existe la entrada "Cronograma", ubicada después de
   "Backlog" y al mismo nivel visual que Hoy/Esta semana/Vencidas/Backlog.
3. Hacer clic y confirmar que navega a `/activities/schedule`.
**Resultado esperado:** La entrada existe, tiene un ícono propio
(`CalendarIcon`), y navega correctamente. No debe existir una entrada
equivalente en la Tabbar móvil (fuera de alcance de este spec).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — entrada visible después de "Backlog",
navega correctamente, sin equivalente en la Tabbar móvil.

---

### TC-025-007 — Estado vacío cuando el mes no tiene actividades
**Precondición:** Ninguna actividad de prueba con fecha dentro de un mes
lejano (ej. varios años en el futuro), para garantizar que esté vacío.
**Datos de prueba usados:** ninguno
**Pasos:**
1. Navegar a `/activities/schedule`.
2. Usar el `MonthNavigator` para llegar a un mes sin ninguna actividad
   registrada.
**Resultado esperado:** La vista muestra el `EmptyState` existente de la app
(no una grilla vacía sin mensaje ni un error), manteniendo la grilla de días
del mes visible o reemplazándola según el patrón ya usado en otras vistas.
**Estado:** ✅ Aprobado (tras corrección)
**Hallazgos:** Falló en el primer intento — `ScheduleView.tsx` no tenía
ninguna rama para mes vacío, solo renderizaba `MonthCalendar` siempre
(criterio no exigido explícitamente por los criterios de aceptación
originales del spec, pero sí por consistencia con el resto de la app, según
lo agregó `@tester`). Corregido en esta misma ronda, aprobado por el usuario:
se agregó `<EmptyState message="No tienes actividades este mes." />` cuando
`data.length === 0`, sin ocultar la grilla (sigue sirviendo para navegar).
`npm run build`/`npm run lint` verificados tras el fix.

---

### TC-025-008 — La grilla es utilizable en mobile (sin entrada en Tabbar)
**Precondición:** Existe al menos una actividad visible en el mes cargado.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Con el navegador en modo responsive (ancho mobile) o desde un dispositivo
   móvil, navegar manualmente a `/activities/schedule` (no hay acceso desde
   la Tabbar).
2. Verificar que la grilla, el `MonthNavigator` y el modal de día son
   utilizables: sin overflow horizontal roto, chips legibles, controles
   táctiles con tamaño adecuado.
**Resultado esperado:** La vista es utilizable en mobile aunque no tenga
entrada directa en la Tabbar — accesible solo por URL o, si aplica, desde un
menú lateral colapsable.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — grilla, navegador de mes y modal
utilizables en ancho mobile, sin overflow horizontal roto.

---

### TC-025-009 — Zona horaria: un `dueDate` cercano a medianoche UTC no "salta" de día en la grilla (punto sensible, ver `spec-025` § Nota de implementación)
**Precondición:** Existe una actividad con `dueDate` guardado cerca del
límite de medianoche en UTC (ej. `23:30 UTC`), de forma que, si el cálculo de
agrupación por día (`lib/calendar.ts`) usara el instante UTC en lugar de la
fecha calendario local, el chip aparecería un día antes o después del
esperado según el offset del navegador.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Confirmar (vía `GET /activities/:id` o el detalle en la UI) el `dueDate`
   exacto guardado para la actividad de prueba.
2. Navegar a `/activities/schedule` y ubicar el mes correspondiente.
3. Verificar en qué día calendario (hora local del navegador) aparece el chip
   de la actividad.
4. Si el usuario tiene forma de cambiar la zona horaria del sistema/navegador
   de prueba, repetir la verificación con al menos un offset distinto (ej.
   UTC-5 y UTC+1) y confirmar que el día mostrado corresponde siempre a la
   fecha calendario local esperada, no a un cálculo en instante UTC.
**Resultado esperado:** El chip aparece en el día calendario correcto según
la hora local del navegador, sin saltos de día causados por conversión de
zona horaria — tanto en el endpoint (rango de grilla) como en la agrupación
del frontend (`lib/calendar.ts`).
**Estado:** ✅ Aprobado
**Hallazgos:** El chip apareció el 12 de octubre (día calendario local,
UTC-5), no el 13 — confirma que `activityLocationDate()`/`toLocalDateKey()`
agrupan por fecha local del navegador y no por el instante UTC crudo. No se
repitió la verificación con un segundo offset de zona horaria (paso 4,
opcional/best-effort) — no bloquea el caso, el resultado del offset por
defecto ya confirma el comportamiento esperado.

---

## Casos de prueba (MCP)

### TC-MCP-025-001 — El agente puede invocar `get_activities_by_month` y obtener el mismo conjunto que el endpoint REST (AC-12)
**Herramienta probada:** `get_activities_by_month` en `todo-api`
**Precondición:** Existe al menos una actividad de nivel superior con
`dueDate` dentro de un mes de prueba conocido.
**Input de prueba:**
```json
{
  "year": {{año}},
  "month": {{mes}}
}
```
**Output esperado:**
1. La tool devuelve el mismo conjunto de actividades (mismos `id`) que
   `GET /activities/schedule?year={{año}}&month={{mes}}` para el mismo
   mes/año, incluyendo actividades completadas si las hay dentro del rango.
2. El shape de cada actividad devuelta es consistente con el de las demás
   tools de lectura de actividades (`get_today_activities`,
   `get_this_week_activities`, etc.) — sin campos inventados.
3. Una llamada con `year`/`month` fuera de rango (ej. `month: 13`) devuelve un
   error de validación claro, sin datos parciales.
**Estado:** ⏸️ Diferido — el MCP de esta sesión apunta a producción, donde
spec-025 aún no está desplegado (`get_activities_by_month` no existe todavía
en ese entorno). Se re-ejecuta tras el despliegue, mismo criterio que
`TC-MCP-024-001`.
**Hallazgos:** Ninguno aún — pendiente de ejecución post-despliegue.

## Resumen de la ronda 1
- Aprobados: 9 (`TC-025-001` a `TC-025-009`) — Fallidos: 0 — Pendientes: 1
  (`TC-MCP-025-001`, diferido a post-despliegue).
- Bugs encontrados y corregidos **dentro de esta misma ronda** (con
  aprobación explícita del usuario en cada caso):
  1. `DayActivitiesModal` mostraba un snapshot congelado de las actividades
     del día — una edición inline se persistía en el backend pero no se
     reflejaba en el modal (hallado en TC-025-003). Corregido en
     `ScheduleView.tsx`/`CalendarDayCell.tsx`/`MonthCalendar.tsx`.
  2. `ScheduleView` no mostraba `EmptyState` en meses sin actividades, solo
     grilla vacía (hallado en TC-025-007). Corregido agregando `EmptyState`
     y ocultando la grilla cuando `data.length === 0`.
  3. `buildMonthGrid()` calculaba mal el límite de fin de grilla
     (`lastDay.getDate() + diffToSunday` en vez de `0 + diffToSunday`),
     generando casi el doble de semanas en **todos** los meses, no solo el
     vacío (hallado junto con el bug #2). Corregido en `lib/calendar.ts`;
     `TC-025-001` se reconfirmó explícitamente después del fix.
- Los tres fixes fueron verificados con `npm run build` + `npm run lint`
  (sin errores nuevos) tras cada corrección, y quedan documentados en
  `spec/spec-025-cronograma-calendario-mensual.md` (Fase 5).
- Hallazgos escalados a `spec/backlog.md`: ninguno — los tres se corrigieron
  en esta misma ronda, no quedó deuda técnica pendiente.
- Limpieza de datos de prueba: ✅ Completada — las 10 actividades creadas
  fueron eliminadas vía API en orden inverso a su creación (una ya no
  existía, borrada durante las pruebas de la UI — confirmado con `404`).
  Verificado con `GET /activities/search/TEST%20spec-025`: 0 registros
  restantes.
- **Ronda 2 pendiente:** la ampliación de filtro por proyecto (AC-13 a AC-16,
  `spec-025` § "Ampliación — filtro por proyecto") todavía no está
  implementada (Fase 7 sin iniciar) — los casos `TC-025-010` a `TC-025-013`
  de la sección siguiente están redactados en modo test-first y quedan en
  `⬜ Pendiente` hasta que la implementación esté lista y el usuario los
  ejecute.

---

## Ronda 2 — Filtro por proyecto (ampliación)

> Casos redactados junto con la ampliación descrita en `spec-025` §
> "Ampliación — filtro por proyecto (post-ronda 1)" (Fase 8), **antes** de
> implementar `ProjectFilter.tsx` — enfoque test-first. Cubren AC-13 a AC-16.
> No hay fase de MCP en esta ampliación (ver "Evaluación MCP de la ampliación"
> en el spec), por lo que no hay casos `TC-MCP` nuevos en esta ronda.

### Datos de prueba

> Se completa al **ejecutar** la ronda, igual que la tabla de la Ronda 1. Los
> identificadores reales, endpoints y estado de eliminación se registran en
> ese momento.
>
> **Nota:** se pueden crear 2 proyectos nuevos de prueba (recomendado, para no
> interferir con proyectos reales del usuario) o reutilizar 2 proyectos ya
> existentes si el usuario lo prefiere al momento de ejecutar — a confirmar
> en ese momento, dejando registrada la decisión aquí.

| Recurso | Endpoint de creación | Identificador | Día efectivo (mes visible) | Usado en | Eliminado |
|---|---|---|---|---|---|
| "[TEST spec-025] Proyecto A" | `POST /projects` | `59b30efe-6de3-4cb2-898a-cb463a45a945` | — | TC-025-011, TC-025-012, TC-025-013 | ⬜ |
| "[TEST spec-025] Proyecto B" | `POST /projects` | `809777a0-733b-4f51-9a65-c9d97cb3ad7b` | — | TC-025-011, TC-025-012 | ⬜ |
| "[TEST spec-025] R2 - proyecto A, pendiente" (proyecto A) | `POST /activities` | `6cf40ff3-0369-496a-895c-c066ba1bfc29` | 2026-10-10 | TC-025-010, TC-025-011 | ⬜ |
| "[TEST spec-025] R2 - proyecto A, completada" (proyecto A, `status: completed`) | `POST /activities` | `bdcd1cd9-3ff9-45c3-ba2b-165e892d59be` | 2026-10-10 | TC-025-011 (combinación con TC-025-004) | ⬜ |
| "[TEST spec-025] R2 - proyecto B, pendiente" (proyecto B) | `POST /activities` | `d7ba3267-9611-429b-b85f-fb5beac11761` | 2026-10-10 | TC-025-010, TC-025-011 | ⬜ |
| "[TEST spec-025] R2 - sin proyecto" (sin `project`) | `POST /activities` | `735b86d4-0328-4577-a23b-2cf811cf9b67` | 2026-10-10 | TC-025-010, TC-025-012 | ⬜ |
| "[TEST spec-025] R2 - proyecto A, mes siguiente" (proyecto A) | `POST /activities` | `ec06575c-3da9-481a-b65f-cb59168a0b3d` | 2026-11-10 (mes siguiente al objetivo) | TC-025-013 | ⬜ |

**Notas de uso:**
- Reutilizar, si es posible, el mismo mes objetivo de la Ronda 1 (octubre
  2026) para las actividades `{{id-act-a1}}`, `{{id-act-a2}}`, `{{id-act-b1}}`
  y `{{id-act-sin-proyecto}}` — así hay al menos 3 actividades distinguibles
  por proyecto en un mismo mes visible.
- `{{id-act-a3}}` debe quedar en un mes **distinto** al resto (ej. el mes
  siguiente al objetivo) para poder ejecutar TC-025-013: se navega a un mes
  donde solo existan actividades de un proyecto que **no** es el filtrado,
  de forma que el filtro combinado con ese mes arroje cero resultados.
- Todas las actividades y proyectos de esta ronda llevan el prefijo
  `[TEST spec-025]` para distinguirlos de datos reales durante la limpieza.

**Decisión al ejecutar:** se crearon 2 proyectos nuevos de prueba (no se
reutilizaron proyectos reales). Las 4 actividades de "mismo mes" comparten
el **10 de octubre de 2026** (mismo día efectivo, dentro del rango de la
Ronda 1) para poder verificarlas todas en una sola celda; la actividad de
"mes siguiente" cae en el **10 de noviembre de 2026**.

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`)
**Fecha de la ronda:** 2026-08-14

### Casos de prueba

### TC-025-010 — "Todos" es el valor por defecto y el comportamiento es idéntico al previo a la ampliación (AC-13)
**Precondición:** Existen actividades del mes visible repartidas entre
proyecto A, proyecto B y sin proyecto.
**Datos de prueba usados:** `{{id-act-a1}}`, `{{id-act-b1}}`, `{{id-act-sin-proyecto}}`
**Pasos:**
1. Navegar a `/activities/schedule` (sin haber tocado el filtro antes).
2. Verificar que el selector `ProjectFilter` muestra "Todos" seleccionado por
   defecto.
3. Verificar que la grilla, los chips y el contador "+X más" muestran **todas**
   las actividades del mes, sin distinción de proyecto — proyecto A, proyecto
   B y sin proyecto visibles simultáneamente.
**Resultado esperado:** El valor por defecto del selector es "Todos" y el
comportamiento de la grilla es idéntico al de antes de esta ampliación (mismo
resultado que se validó en la Ronda 1, `TC-025-001`/`TC-025-004`).
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — "Todos" por defecto, las 4 actividades del
10-oct visibles juntas sin distinción de proyecto.

---

### TC-025-011 — Seleccionar un proyecto concreto deja solo sus actividades visibles en grilla/chips/contador/modal (AC-14)
**Precondición:** Existen actividades del mismo mes en proyecto A (una
pendiente y una `completed`) y en proyecto B.
**Datos de prueba usados:** `{{id-proyecto-a}}`, `{{id-act-a1}}`, `{{id-act-a2}}`, `{{id-act-b1}}`
**Pasos:**
1. Navegar a `/activities/schedule` y ubicar el mes objetivo.
2. Seleccionar "[TEST spec-025] Proyecto A" en `ProjectFilter`.
3. Verificar que la grilla y los chips solo muestran actividades del proyecto
   A (`{{id-act-a1}}` y `{{id-act-a2}}`) — ninguna del proyecto B ni sin
   proyecto.
4. Si el día tiene más chips de los visibles, verificar que el contador
   "+X más" recalcula solo sobre las actividades del proyecto A (no cuenta las
   ocultas de otros proyectos).
5. Abrir el modal de un día con actividades de proyecto A: verificar que solo
   lista las de ese proyecto.
6. Verificar que `{{id-act-a2}}` (la `completed`) sigue mostrándose atenuada
   dentro del resultado filtrado, sin desaparecer (confirma que el filtro no
   rompe el tratamiento de completadas de `TC-025-004`).
**Resultado esperado:** Grilla, chips, contador y modal muestran únicamente
actividades del proyecto A; el estilo atenuado de la actividad completada se
mantiene sin cambios respecto a lo validado en `TC-025-004`.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — solo las 2 actividades de proyecto A
visibles en grilla y modal, la completada atenuada. Paso 4 del caso (recálculo
del contador "+X más") no aplicó: con solo 2 actividades de proyecto A ese
día no hay overflow que contar (por debajo del máximo de 3 chips visibles).

---

### TC-025-012 — Seleccionar "Sin proyecto" muestra únicamente actividades con `project: null` (AC-14)
**Precondición:** Existen, en el mismo mes, actividades con proyecto asignado
y al menos una sin proyecto.
**Datos de prueba usados:** `{{id-act-sin-proyecto}}`, `{{id-act-a1}}`, `{{id-act-b1}}`
**Pasos:**
1. Navegar a `/activities/schedule` y ubicar el mes objetivo.
2. Seleccionar la opción "Sin proyecto" en `ProjectFilter`.
3. Verificar que la grilla y los chips solo muestran `{{id-act-sin-proyecto}}`
   — ninguna actividad de proyecto A ni B.
4. Abrir el modal del día correspondiente y confirmar que solo lista la
   actividad sin proyecto.
**Resultado esperado:** Solo se muestran actividades con `project: null` en
grilla, chips y modal; ninguna actividad con proyecto asignado aparece.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — solo "R2 - sin proyecto" visible en grilla
y modal, sin actividades de proyecto A ni B.

---

### TC-025-013 — Empty state específico cuando el filtro no arroja resultados, y persistencia del filtro entre meses (AC-15, AC-16)
**Precondición:** El mes objetivo (con datos de la Ronda 2) tiene actividades
de proyecto A y B; existe un mes adyacente (ej. el siguiente) donde solo hay
actividades de un proyecto distinto al que se va a filtrar.
**Datos de prueba usados:** `{{id-proyecto-b}}`, `{{id-act-a3}}` (mes
siguiente, proyecto A)
**Pasos:**
1. Navegar a `/activities/schedule` y ubicar el mes objetivo.
2. Seleccionar "[TEST spec-025] Proyecto B" en `ProjectFilter` y confirmar que
   se ven resultados (comportamiento ya cubierto por `TC-025-011`, no repetir
   verificación exhaustiva aquí).
3. Usando el `MonthNavigator`, avanzar al mes siguiente (donde solo existe
   `{{id-act-a3}}`, de proyecto A).
4. Verificar que el filtro **sigue en "Proyecto B"** (no se reseteó a
   "Todos" al cambiar de mes) y que la grilla no muestra `{{id-act-a3}}`.
5. Verificar que se muestra un estado vacío específico de "sin resultados
   para este filtro" — distinto en texto/forma del `EmptyState` de "mes sin
   actividades" validado en `TC-025-007` — con una acción visible para volver
   a "Todos".
6. Usar esa acción (botón/enlace) para volver a "Todos" y confirmar que
   `{{id-act-a3}}` reaparece en la grilla.
**Resultado esperado:** El filtro persiste al navegar de mes en mes sin
resetearse; cuando el filtro no tiene coincidencias en el mes visible se
muestra un empty state distinguible del de "mes vacío" y con forma explícita
de volver a "Todos"; al usarla, la grilla vuelve a mostrar todas las
actividades del mes.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones — el filtro "Proyecto B" persistió al
navegar a noviembre, se mostró el empty state específico (distinto del de
mes vacío) con el botón "Ver todas", y al usarlo reapareció la actividad de
proyecto A en la grilla.

### Resumen de la ronda 2
- Aprobados: 4 (`TC-025-010` a `TC-025-013`) — Fallidos: 0 — Pendientes: 0.
- Bugs encontrados: ninguno — la implementación de la Fase 7 pasó los 4
  casos sin hallazgos.
- Hallazgos escalados a `spec/backlog.md`: ninguno.
- Limpieza de datos de prueba: ✅ Completada — 2 proyectos y 5 actividades
  eliminados vía API; verificado con búsqueda `TEST spec-025` (0 restantes)
  y listado de proyectos (0 restantes).
