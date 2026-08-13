# test-025 — Cronograma: vista de calendario mensual de actividades

## Datos de prueba
> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.
>
> Esta tabla se completa al **ejecutar** la ronda (no al redactar el spec):
> los identificadores reales, endpoints usados y el estado de eliminación se
> registran en ese momento, siguiendo "Pruebas manuales asistidas por Claude"
> del `CLAUDE.md` raíz.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Actividad "{{nombre}}" — nivel superior, `dueDate` dentro del mes objetivo | `POST /activities` | `{{id}}` | TC-025-001 | ⬜ |
| Actividad "{{nombre}}" — `dueDate` en día de relleno (mes anterior) | `POST /activities` | `{{id}}` | TC-025-001 | ⬜ |
| Actividad "{{nombre}}" — `dueDate` en día de relleno (mes siguiente) | `POST /activities` | `{{id}}` | TC-025-001 | ⬜ |
| Actividad "{{nombre}}" — mes A (para navegar a mes B) | `POST /activities` | `{{id}}` | TC-025-002 | ⬜ |
| Actividad "{{nombre}}" — mes B (destino de la navegación) | `POST /activities` | `{{id}}` | TC-025-002 | ⬜ |
| Actividad "{{nombre}}" — con subtareas propias, para abrir su `ActivityCard` desde el modal de día | `POST /activities` | `{{id}}` | TC-025-003 | ⬜ |
| Subtarea "{{nombre}}" — hija de la actividad anterior | `POST /activities` | `{{id}}` | TC-025-003 | ⬜ |
| Actividad "{{nombre}}" — `status: completed`, `dueDate` dentro del mes objetivo | `POST /activities` | `{{id}}` | TC-025-004 | ⬜ |
| Actividad "{{nombre}}" — `status: pending`, mismo día que la anterior (para comparar contraste) | `POST /activities` | `{{id}}` | TC-025-004 | ⬜ |
| Actividad "{{nombre}}" — cualquier `dueDate` visible, usada solo para tener contenido en pantalla al revisar dark mode | `POST /activities` | `{{id}}` | TC-025-005 | ⬜ |
| Mes sin ninguna actividad (no requiere creación — se navega a un mes vacío, ej. varios años en el futuro) | — | — | TC-025-007 | — |
| Actividad "{{nombre}}" — `dueDate` con hora cercana a medianoche en UTC (ej. `23:30 UTC`), para validar que no "salta" de día según timezone local | `POST /activities` | `{{id}}` | TC-025-009 | ⬜ |
| Actividad "[TEST spec-025] MCP — {{nombre}}" — `dueDate` dentro de un mes de prueba, creada vía `create_activity` MCP | MCP `create_activity` | `{{id}}` | TC-MCP-025-001 | ⬜ |

**Notas de uso:**
- Elegir un mes objetivo donde el día 1 **no** caiga en Lunes y el último día
  **no** caiga en Domingo, para que TC-025-001 pueda verificar relleno tanto
  al inicio como al final de la grilla en la misma corrida.
- Para TC-025-002, usar dos meses consecutivos con al menos una actividad cada
  uno, de forma que el cambio de contenido al navegar sea visualmente
  verificable.
- Todas las actividades de esta ronda deben quedar **sin proyecto** asociado,
  salvo que un caso puntual requiera lo contrario.

**Entorno de pruebas:** {{desarrollo / staging}}
**Fecha de la ronda:** {{fecha}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

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
**Estado:** ⬜ Pendiente
**Hallazgos:** {{a completar durante la ronda}}

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: 10 (todos, ronda aún no
  ejecutada)
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente
