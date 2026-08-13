# spec-024 — [NOT STARTED] Completar subtareas automáticamente al completar la tarea padre

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

## Contexto

Deuda técnica detectada usando la app. Hoy, cuando el usuario marca una tarea
padre como **completada** —desde la edición rápida de la card (spec-012), desde
el formulario de actividad, desde la API REST o desde el MCP— sus **subtareas
quedan intactas** en el estado en que estuvieran (`pending`, `in_progress`,
`on_hold`…).

El efecto práctico es que la app queda mintiendo: hay tareas hijas que siguen
apareciendo como pendientes en `Today`, `This week`, `Overdue` y en el detalle
del proyecto, aunque el trabajo del que forman parte ya está terminado. El
usuario tiene que ir subtarea por subtarea cerrándolas a mano, y en la práctica
no lo hace, así que las vistas de pendientes acumulan ruido.

Completar el padre implica, en el modelo mental del usuario, que todo lo que
colgaba de él está hecho. El sistema debe reflejarlo.

## Alcance

Cuando una actividad **pasa a `completed`**, todas sus subtareas —y las
subtareas de estas, recursivamente— pasan también a `completed`.

### Decisiones tomadas con el usuario

- **Qué subtareas se arrastran:** **todas**, sin excepción, incluidas las que
  estén en `cancelled`. No se preserva ningún estado previo de las hijas.
- **Reversión:** **no hay**. Si el padre se desmarca (de `completed` a cualquier
  otro estado), las subtareas **siguen completadas**. La propagación es de un
  solo sentido; el sistema no deshace trabajo por su cuenta.
- **Anidamiento:** **recursivo, todos los niveles**. Si una subtarea tiene sus
  propias subtareas, también se completan, hasta el final del árbol.
- **Dónde vive la regla:** en `ActivitiesService.update()` (backend). Al ser una
  regla de negocio del servicio, aplica automáticamente a **los tres canales**:
  UI (edición rápida y formulario), REST (`PATCH /activities/:id`) y MCP
  (`update_activity`). No se duplica lógica en el frontend.
- **Disparo:** solo en la **transición** hacia `completed` (el estado anterior
  del padre no era `completed`). Guardar una tarea que ya estaba completada, sin
  tocar su status, no vuelve a disparar la propagación.

### Lo que NO incluye

- Ninguna reversión ni "descompletar en cascada".
- Ninguna confirmación ni diálogo previo en la UI: la propagación es silenciosa
  y automática.
- Propagación en sentido inverso (completar todas las hijas **no** completa al
  padre automáticamente).
- Cambios en el modelo de datos: no se agregan columnas ni se rastrea qué
  subtarea fue completada manualmente vs. por propagación.
- Propagación de otros campos del padre a las hijas (prioridad, fecha, proyecto…).
- Cambios en `recurrence-scheduler.service.ts` ni en el comportamiento de
  plantillas/instancias recurrentes.

## Impacto en el sistema

### Backend

| Archivo | Cambio |
|---------|--------|
| `backend/src/activities/activities.service.ts` | Capturar el status previo **antes** del `Object.assign` de `update()`; tras el `save`, si hubo transición a `completed`, invocar el nuevo método privado de propagación. Nuevo método `completeSubtaskTree(rootId)`: recorre el árbol de descendientes por niveles (`In([...ids])`) y aplica un `UPDATE ... SET status = 'completed'` sobre todos ellos, con guarda anti-ciclo por ids ya visitados. |
| `backend/src/activities/activities.service.spec.ts` | Casos unitarios nuevos (ver "Pruebas asociadas"). |
| `backend/test/e2e-024-completar-subtareas-con-tarea-padre.e2e-spec.ts` | Nuevo archivo de pruebas e2e. |

> ⚠️ Punto de cuidado en la implementación: `update()` hace
> `Object.assign(activity, ...rest)` en la línea ~235, lo que **ya sobrescribe**
> `activity.status` con el valor entrante. El status previo debe leerse antes de
> esa línea, no después, o la detección de transición nunca funcionará.

- **No requiere migración**: no cambia el esquema. Solo escribe la columna
  `status` de filas ya existentes.
- **No se toca `create()`**: crear una actividad ya completada no tiene
  subtareas todavía, así que no aplica.

### Frontend

**Sin cambios de código.** `useUpdateActivity()`
(`frontend/src/hooks/useActivities.ts:80`) ya invalida la query key
`['activities']`, y React Query invalida por prefijo — lo que cubre también
`['activities', parentId, 'subtasks']` (`useActivitySubtasks`, línea 96). Tras
completar el padre, las subtareas se refetchean solas y la UI muestra el estado
nuevo sin intervención adicional.

Este spec verifica ese supuesto en las pruebas manuales en lugar de asumirlo.

## Evaluación MCP

**¿Aplica MCP?** Sí (documentación, sin tools nuevas).

- **MCP existente a modificar:** `todo-api` — **no se agregan ni se cambian
  tools**. `update_activity` ya delega en `ActivitiesService.update()`, así que
  hereda la propagación automáticamente sin tocar `mcp.service.ts` ni su schema
  Zod.
- **MCP nuevo a crear:** ninguno.
- **System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` —
  **debe** documentar el efecto secundario: al usar `update_activity` con
  `status: "completed"` sobre una tarea con subtareas, el agente está cerrando
  también todo el árbol de descendientes. Sin esto, el agente puede provocar un
  cambio masivo de estado sin advertírselo al usuario.
- **Fase de MCP en este spec:** Fase 3.

## Fases de implementación

### Fase 1 — Propagación en el servicio

- [ ] En `ActivitiesService.update()`, capturar `previousStatus` antes del
      `Object.assign` que sobrescribe los campos entrantes.
- [ ] Tras el `save`, detectar la transición
      (`previousStatus !== COMPLETED && saved.status === COMPLETED`).
- [ ] Implementar el método privado `completeSubtaskTree(rootId: string)`:
      recolectar descendientes nivel por nivel con `find({ where: { parent: { id: In(ids) } } })`
      hasta que no queden más, acumulando ids ya visitados como guarda
      anti-ciclo, y aplicar un único `UPDATE` masivo por id.
- [ ] Invocar la propagación solo ante la transición detectada.
- [ ] Verificar que el `Activity` devuelto por `update()` sigue siendo el padre
      guardado (no cambia el contrato de la respuesta del endpoint).

### Fase 2 — Pruebas automáticas en verde

- [ ] Ejecutar los casos unitarios y e2e escritos junto con este spec y llevarlos
      de rojo a verde sin modificar sus asserts.
- [ ] `npm run test` y `npm run test:e2e` en `backend/` sin regresiones.

### Fase 3 — MCP: actualizar `todo-api`

- [ ] Confirmar que **no** hacen falta cambios en `mcp.service.ts`
      (`update_activity` ya delega en el servicio).
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md` con la regla:
      completar una tarea con `update_activity` completa también todas sus
      subtareas en cascada, de forma irreversible.
- [ ] Revisar `docs/mcps/README.md` y actualizarlo solo si el cambio de
      comportamiento lo amerita (no hay tools nuevas que registrar).
- [ ] Verificar con una llamada real al MCP que `update_activity` con
      `status: "completed"` cierra el árbol de subtareas (caso `TC-MCP-024-001`).

### Fase 4 — Documentación y pruebas manuales

- [ ] Documentar la regla en la sección "Lógica de Negocio Importante" de
      `backend/CLAUDE.md`.
- [ ] Ejecutar la ronda manual de `docs/testing/test-024-completar-subtareas-con-tarea-padre.md`
      (la ejecuta el usuario sobre la UI; Claude prepara datos y registra hallazgos).

## Criterios de aceptación

1. Al cambiar el status de una tarea padre a `completed`, **todas** sus subtareas
   directas quedan en `completed`.
2. La propagación es **recursiva**: nietos, bisnietos y descendientes más
   profundos también quedan en `completed`.
3. Las subtareas en `cancelled` **también** pasan a `completed` (decisión
   explícita del usuario: se arrastran todas).
4. Al cambiar el status del padre de `completed` a `pending` (u otro estado), las
   subtareas **permanecen** en `completed` — no hay reversión.
5. Actualizar una tarea padre **sin** cambiar su status (ej. renombrarla) no
   modifica el status de sus subtareas.
6. Actualizar un padre que **ya estaba** en `completed` (reenviando
   `status: "completed"`) no altera subtareas que el usuario haya reabierto
   manualmente después.
7. Completar una tarea **sin** subtareas funciona igual que hoy, sin errores.
8. La respuesta del `PATCH /activities/:id` sigue devolviendo el padre
   actualizado, con el mismo shape que antes.
9. En la UI, tras completar el padre desde la card, las subtareas se muestran
   como completadas sin necesidad de recargar la página.
10. El agente puede invocar `update_activity` con `status: "completed"` y obtener
    el mismo comportamiento en cascada que la UI.

## Pruebas asociadas

> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al
> spec" en `CLAUDE.md`).

- **Manuales:** `docs/testing/test-024-completar-subtareas-con-tarea-padre.md` —
  casos `TC-024-*` y `TC-MCP-024-001`.
- **Automáticas (backend):**
  - `backend/test/e2e-024-completar-subtareas-con-tarea-padre.e2e-spec.ts` — un
    caso por criterio de aceptación verificable vía API.
  - `backend/src/activities/activities.service.spec.ts` — casos unitarios de la
    detección de transición y del recorrido recursivo.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.

- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{pendiente}}
