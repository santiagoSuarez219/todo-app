# test-033 — Estado `testing`: trabajo hecho, pendiente de probar

> Casos manuales del `spec-033`. Redactados junto con el spec (test-first):
> **todos fallan hasta que spec-033 esté implementado**, porque el valor
> `testing` todavía no existe en el enum.
> La ejecución de los casos `TC-033-xx` la hace el usuario sobre la UI; Claude
> prepara los datos, guía el proceso y registra los hallazgos.

## Datos de prueba

> Recursos creados vía API para poder ejecutar estos casos.
> Deben eliminarse al cerrar la ronda de pruebas.

| Recurso | Endpoint de creación | Identificador | Eliminado |
|---------|----------------------|---------------|-----------|
| Proyecto "Proyecto pruebas spec-033" | `POST /projects` | `53abb34e-fb52-49e6-83fd-23e827b05523` | ⬜ |
| Actividad A — "Implementar login" (`in_progress`, `dueDate` = hoy, con 2 subtareas pendientes) | `POST /activities` | `2988e1fa-e286-49f0-bde4-da891e28ecfb` | ⬜ |
| Subtarea A.1 — "Escribir el endpoint" (`pending`) | `POST /activities` (`parentId` = A) | `8d484996-dbaf-4838-8e0e-3568f56f1bc8` | ⬜ |
| Subtarea A.2 — "Conectar el formulario" (`pending`) | `POST /activities` (`parentId` = A) | `ca4cf6da-99ef-4801-80a8-314936c31e49` | ⬜ |
| Actividad B — "Corregir cálculo de cuotas" (`completed`, `dueDate` = hoy) | `POST /activities` | `f8210b82-1b5f-411e-b048-2a996eb0c211` | ⬜ |
| Actividad C — "Migrar tabla de gastos" (`pending`, `dueDate` = hace 3 días) | `POST /activities` | `ef54ad8f-9bf4-42d3-8192-234891011c7e` | ⬜ |
| Actividad D — "Ajustar responsive del tabbar" (`pending`, `dueDate` = en 2 días, mismo mes) | `POST /activities` | `34b1140a-4282-4393-bea4-90f42b4a7221` | ⬜ |

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`, frontend en `http://localhost:5173`)
**Fecha de la ronda:** 2026-08-17

## Casos de prueba

### TC-033-001 — El selector de estado ofrece "En pruebas"
**Precondición:** Actividad A existe.
**Datos de prueba usados:** Actividad A.
**Pasos:**
1. Abrir la actividad A en el formulario de edición.
2. Desplegar el selector "Estado".
**Resultado esperado:** Aparece la opción **"En pruebas"**, ubicada **entre "En progreso" y "Completada"**. Las demás opciones conservan su texto actual ("Pendiente", "En progreso", "Completada", "Cancelada", "En pausa", "Esperando").
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía árbol de accesibilidad del formulario: el `<select>` de Estado ofrece exactamente `Pendiente → En progreso → En pruebas → Completada → Cancelada → En pausa → Esperando`, con `value="testing"` en la nueva opción. Sin observaciones.

### TC-033-002 — Guardar una actividad en "En pruebas"
**Precondición:** TC-033-001 aprobado.
**Datos de prueba usados:** Actividad A.
**Pasos:**
1. En el formulario de la actividad A, seleccionar "En pruebas".
2. Guardar.
3. Volver a abrir la actividad.
**Resultado esperado:** Se guarda sin errores; al reabrir, el selector sigue mostrando "En pruebas". No aparece ningún campo extra en el formulario (a diferencia de "Esperando", que muestra "Esperando a" / "Esperando desde").
**Estado:** ✅ Aprobado
**Hallazgos:** El estado se guardó correctamente como `testing` y persistió al reabrir; sin campos extra en el formulario, tal como se esperaba. **Hallazgo fuera de scope, no bloqueante:** al guardar, la fecha límite se corrió un día hacia atrás en la UI (17→16 de ago) — bug preexistente de `ActivityForm.tsx` en el manejo de `dueDate` (trunca la hora a `slice(0,10)` y el backend persiste el date-only como medianoche UTC, que en Colombia, UTC-5, cae en el día anterior). Reproducido de forma determinística guardando sin tocar ningún campo. Sin relación con el estado `testing` — afecta cualquier guardado del formulario. Registrado en `spec/backlog.md` bajo spec-033; dato de prueba restaurado vía API tras la verificación.

### TC-033-003 — El badge distingue "En pruebas" visualmente
**Precondición:** Actividad A en estado `testing` (TC-033-002).
**Datos de prueba usados:** Actividad A.
**Pasos:**
1. Ir a la vista donde se lista la actividad A (Dashboard o detalle del proyecto).
2. Observar el badge de estado de la actividad A y compararlo con actividades en "En progreso" y "Completada".
**Resultado esperado:** El badge dice **"En pruebas"** y su color se distingue a simple vista del azul de "En progreso" y del verde de "Completada". Legible tanto en tema claro como oscuro.
**Estado:** ✅ Aprobado
**Hallazgos:** Badge rojo, claramente distinguible del verde de "Completado" (comparado en la pestaña Completadas) y del azul de "En progreso". Verificado en ambos temas: claro (fondo rojo suave, texto rojo oscuro) y oscuro (fondo rojo oscuro translúcido, texto rojo claro) — legible en los dos. Sin observaciones.

### TC-033-004 — Edición rápida de estado desde la card
**Precondición:** Actividad D existe en `pending`.
**Datos de prueba usados:** Actividad D.
**Pasos:**
1. Localizar la card de la actividad D.
2. Abrir el desplegable de estado de la card (edición rápida, spec-012).
3. Seleccionar "En pruebas".
**Resultado esperado:** La opción aparece en el desplegable con su punto de color, entre "En progreso" y "Completada". Al seleccionarla, la card se actualiza al nuevo estado sin recargar la página.
**Estado:** ✅ Aprobado
**Hallazgos:** El desplegable de edición rápida muestra "En pruebas" con punto rojo, exactamente entre "En progreso" y "Completada". Al seleccionarla, la card se actualiza de inmediato sin recargar. Verificado por API que persistió (`status: testing`) y que, a diferencia del formulario completo (ver TC-033-002), esta vía **no** reenvía `dueDate` — la fecha límite de la actividad quedó intacta. Sin observaciones.

### TC-033-005 — `testing` no oculta la actividad de la vista Hoy
**Precondición:** Actividad A en `testing` con `dueDate` = hoy.
**Datos de prueba usados:** Actividad A.
**Pasos:**
1. Ir a la vista "Hoy".
**Resultado esperado:** La actividad A **sigue apareciendo** en la lista, con el badge "En pruebas". No se comporta como una actividad completada.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-033-006 — `testing` sigue apareciendo en Vencidas
**Precondición:** Actividad C existe con `dueDate` de hace 3 días.
**Datos de prueba usados:** Actividad C.
**Pasos:**
1. Poner la actividad C en "En pruebas" (desde la card o el formulario).
2. Ir a la vista "Vencidas".
**Resultado esperado:** La actividad C aparece entre las vencidas, con el badge "En pruebas".
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-033-007 — `testing` aparece en Semana y en el Cronograma
**Precondición:** Actividad D en `testing` (TC-033-004), con `dueDate` dentro de la semana y del mes en curso.
**Datos de prueba usados:** Actividad D.
**Pasos:**
1. Ir a la vista "Semana".
2. Ir al Cronograma (calendario mensual) del mes actual.
**Resultado esperado:** La actividad D aparece en ambas vistas, en su día correspondiente, con el badge "En pruebas" y sin atenuar (no se muestra como completada).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-033-008 — Pasar a `testing` no completa las subtareas
**Precondición:** Actividad A con las subtareas A.1 y A.2 en `pending`. Si A ya quedó en `testing` por casos anteriores, devolverla primero a "En progreso".
**Datos de prueba usados:** Actividad A, A.1, A.2.
**Pasos:**
1. Cambiar la actividad A a "En pruebas".
2. Abrir el detalle de la actividad A y revisar sus subtareas.
**Resultado esperado:** A.1 y A.2 **siguen en "Pendiente"**. La cascada de completado (spec-024) solo se dispara al pasar a "Completada", no a "En pruebas".
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-033-009 — De "Completada" a "En pruebas" reabre la actividad
**Precondición:** Actividad B en `completed`.
**Datos de prueba usados:** Actividad B.
**Pasos:**
1. Cambiar la actividad B de "Completada" a "En pruebas".
2. Ir a la vista "Hoy" (su `dueDate` es hoy).
**Resultado esperado:** La actividad B vuelve a aparecer como activa en "Hoy" con el badge "En pruebas"; deja de mostrarse como completada (tachado / atenuado, según la vista).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-033-010 — Los estados existentes no cambiaron
**Precondición:** Todas las actividades de la tabla de datos de prueba creadas, más las actividades reales previas del entorno.
**Datos de prueba usados:** Todas.
**Pasos:**
1. Recorrer el Dashboard, el detalle de un proyecto y la vista "Hoy".
2. Observar las etiquetas de estado de actividades **no** tocadas por esta ronda.
**Resultado esperado:** "Pendiente", "En progreso", "Completada", "Cancelada", "En pausa" y "Esperando" conservan exactamente su texto, su color y su comportamiento. Ninguna actividad preexistente cambió de estado tras la migración.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-033-001 — El agente puede poner una actividad en `testing`
**Herramienta probada:** `update_activity` en `todo-api`
**Precondición:** Actividad C existe.
**Input de prueba:** `update_activity({ id: "<id de C>", status: "testing" })`
**Output esperado:** Respuesta exitosa con la actividad en `status: "testing"`. Sin error de validación del esquema Zod.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-033-002 — El agente puede consultar lo pendiente de probar
**Herramienta probada:** `get_activities_by_status` en `todo-api`
**Precondición:** TC-MCP-033-001 ejecutado (al menos una actividad en `testing`).
**Input de prueba:** `get_activities_by_status({ status: "testing" })`
**Output esperado:** La lista incluye la actividad C y **solo** actividades en `testing`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-033-003 — El agente puede crear una actividad ya en `testing`
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:** `create_activity({ name: "Actividad MCP spec-033", status: "testing" })`
**Output esperado:** Actividad creada con `status: "testing"`. **Registrar el ID devuelto en la tabla de datos de prueba** para eliminarlo en la limpieza.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-033-004 — El agente distingue `testing` de `completed`
**Herramienta probada:** `update_activity` (vía el system prompt de `asistente-personal`)
**Precondición:** Actividad A existe.
**Input de prueba:** Pedirle al agente, en lenguaje natural: *"Ya terminé de programar 'Implementar login', pero todavía no la he probado"*.
**Output esperado:** El agente la mueve a `testing`, **no** a `completed` ni la deja en `in_progress`, y lo explica.
**Estado:** ⬜ Pendiente
**Hallazgos:**

## Resumen de la ronda

- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: 14
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente
