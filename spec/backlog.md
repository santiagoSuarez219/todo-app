# Backlog — deuda técnica y hallazgos diferidos

> Registro de deuda técnica detectada durante la implementación o revisión de
> specs, y de hallazgos de rondas de pruebas manuales que no se corrigen en la
> sesión donde se detectan. Cada entrada referencia el spec que la originó.

## spec-024 — Completar subtareas automáticamente al completar la tarea padre

- **Cascada no atómica.** `ActivitiesService.completeSubtaskTree()`
  (`backend/src/activities/activities.service.ts`) ejecuta un `save()` del
  padre y luego un `UPDATE` por nivel del árbol de subtareas, todos como
  statements independientes, sin transacción. Si un nivel intermedio falla,
  el padre queda persistido como `completed` pero el árbol de subtareas queda
  parcialmente completado, y el cliente recibe un 500 pese a que el padre sí
  se guardó. Para el volumen actual de la app es tolerable, pero envolver la
  operación completa en `manager.transaction(...)` (o resolverla con un CTE
  recursivo en un solo statement) eliminaría el estado inconsistente.
  Detectado en revisión de código previa a `[DONE]`.

- **Test unitario superficial del recorrido recursivo.**
  `backend/src/activities/activities.service.spec.ts` (describe
  `completeSubtaskTree() recursive traversal`) verifica que `find` se llama 3
  veces y que `set` recibe `status: COMPLETED`, pero no asserta los
  `parentIds` pasados a cada `find` ni los `ids` del `where('id IN (:...ids)')`
  por nivel, ni ejercita explícitamente la guarda anti-ciclo (`visited`). El
  test pasaría igual si la implementación solo actualizara el primer nivel.
  La recursión real queda cubierta por el caso e2e `TC-024-02`
  (`backend/test/e2e-024-completar-subtareas-con-tarea-padre.e2e-spec.ts`),
  por eso no bloqueó el `[DONE]`, pero conviene reforzar el unitario con
  asserts explícitos en una próxima pasada por el módulo de actividades.

- **`visited` no incluye `rootId`.** En `completeSubtaskTree()`, si existiera
  un ciclo hipotético en la relación auto-referencial `parent`, el propio
  `rootId` podría reaparecer como "hijo" y recibir un `UPDATE` redundante a
  `completed`. Es inocuo (la terminación está garantizada porque `visited`
  crece monótonamente y el bucle corta cuando `childIds.length === 0`), pero
  `visited.add(rootId)` al inicio del método lo dejaría cerrado del todo.
