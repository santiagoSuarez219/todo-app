# Spec 07 — [DONE] Diferenciación por Tipo de Actividad

## Comportamiento deseado por tipo

| Campo / Feature | TASK | REMINDER | EVENT |
|----------------|------|----------|-------|
| `actionDate` | Solo fecha (sin hora) | Fecha + hora del recordatorio | Fecha + hora de inicio |
| `dueDate` | Solo fecha (sin hora) | No aplica (null) | Fecha + hora de fin |
| `duration` / `durationUnit` | Sí | No | No |
| `device` | Sí | No | No |
| `location` | Sí | No | No |
| `automatizacion` | Sí | No | No |
| Subtareas | Sí | No | No |

> No se crean columnas nuevas. Las columnas `actionDate`/`dueDate` se reinterpretan semánticamente según el tipo. No se requieren migraciones.

---

## Fase 1 — Backend: Sanitización por tipo en el servicio

**Objetivo**: Garantizar integridad de datos según el tipo antes de persistir.

**Archivos a editar**: `backend/src/activities/activities.service.ts`

**Pasos**:
1. Definir método privado `sanitizeByType(dto)` que fuerza a `null` los campos que no aplican según `type`:
   - `REMINDER`: forzar `null` en `dueDate`, `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId`
   - `EVENT`: forzar `null` en `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId`
   - `TASK`: sin restricciones
2. Para TASK, truncar la hora de `actionDate` y `dueDate` (mantener solo la fecha). Para EVENT y REMINDER conservar hora completa.
3. Llamar a `sanitizeByType` al inicio de `create()` y `update()`.

- [x] Implementado

---

## Fase 2 — Backend: Documentación del DTO

**Objetivo**: Dejar documentado en el contrato la semántica de `actionDate` y `dueDate` por tipo.

**Archivos a editar**: `backend/src/activities/dto/create-activity.dto.ts`

**Pasos**:
1. Agregar comentarios JSDoc sobre `actionDate` y `dueDate` describiendo su semántica por tipo.
2. Verificar que `duration`, `durationUnit`, `device`, `location`, `automatizacion` y `parentId` tengan `@IsOptional()`.

- [x] Implementado

---

## Fase 3 — Frontend: Selector de tipo al inicio del formulario

**Objetivo**: Reubicar el campo `type` al principio y conectarlo con `useWatch` para controlar la visibilidad dinámica de campos.

**Archivos a editar**: `frontend/src/components/ActivityForm.tsx`

**Pasos**:
1. Mover el campo `type` a la primera posición del formulario.
2. Agregar `useWatch` sobre el campo `type`. Guardar en `watchedType`.
3. Derivar `isTask`, `isReminder`, `isEvent` como variables booleanas simples (sin `useMemo`).
4. Controlar visibilidad con renderizado condicional (`&&`):
   - `actionDate`: siempre visible; tipo `date` para TASK, `datetime-local` para REMINDER y EVENT
   - `dueDate`: visible si `isTask || isEvent`; tipo `date` para TASK, `datetime-local` para EVENT; label "Fin" para EVENT
   - Duración + unidad: solo si `isTask`
   - `device`: solo si `isTask`
   - `location`: solo si `isTask`
   - `automatizacion`: solo si `isTask`

- [x] Implementado

---

## Fase 4 — Frontend: Limpieza de campos al cambiar de tipo

**Objetivo**: Al cambiar el `type`, los campos que desaparecen quedan en `null` para no enviar datos fantasma al backend.

**Archivos a editar**: `frontend/src/components/ActivityForm.tsx`

**Pasos**:
1. Agregar `useEffect` dependiente de `watchedType`.
2. Al cambiar a REMINDER: limpiar `dueDate`, `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId`.
3. Al cambiar a EVENT: limpiar `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId`.
4. Usar una ref `isFirstRender` para que el efecto no se ejecute en el montaje inicial.
5. Usar `setValue(field, null, { shouldDirty: false })` para no marcar el formulario como modificado innecesariamente.

- [x] Implementado

---

## Fase 5 — Frontend: ActivityCard diferenciada por tipo

**Objetivo**: La tarjeta muestra solo la información relevante para cada tipo.

**Archivos a editar**: `frontend/src/components/ActivityCard.tsx`

**Pasos**:
1. Derivar `isTask`, `isReminder`, `isEvent` desde `activity.type`.
2. Sección de fechas por tipo:
   - TASK: `actionDate` como fecha (sin hora) con label "Inicio"; `dueDate` con label "Vence"
   - REMINDER: `actionDate` con fecha y hora con label "Recordatorio"; ocultar `dueDate`
   - EVENT: `actionDate` con fecha y hora con label "Inicio"; `dueDate` con fecha y hora con label "Fin"
3. Duración, dispositivo, ubicación, automatización: renderizar solo si `isTask` y el valor no es nulo.
4. Sección de subtareas (botón toggle + `SubtaskSection`): solo si `isTask`.

- [x] Implementado

---

## Fase 6 — Frontend: Badges de tipo en vistas de lista

**Objetivo**: Las vistas especializadas muestran el tipo como badge visual y los labels de fecha correctos.

**Archivos a editar**:
- `frontend/src/pages/TodayView.tsx`
- `frontend/src/pages/WeekView.tsx`
- `frontend/src/pages/OverdueView.tsx`

**Pasos**:
1. El `ActivityCard` ya diferencia visualmente — verificar si los badges de tipo son suficientes o si se requiere un indicador adicional en las vistas de lista.
2. Revisar la lógica de "vencida" en OverdueView según el campo correcto por tipo:
   - TASK y EVENT: `dueDate < hoy`
   - REMINDER: `actionDate < hoy`

- [x] Implementado

---

## Resumen de fases y commits

| Fase | Scope | Commit sugerido |
|------|-------|----------------|
| 1 | Backend | `feat(backend): sanitize activity fields by type in service` |
| 2 | Backend | `docs(backend): document type-based field semantics in DTO` |
| 3 | Frontend | `feat(frontend): move type selector to top, conditionally render fields` |
| 4 | Frontend | `feat(frontend): clear inapplicable fields on type change` |
| 5 | Frontend | `feat(frontend): differentiate ActivityCard display by type` |
| 6 | Frontend | `feat(frontend): fix overdue logic and type labels in list views` |

## Dependencias entre fases

```
Fase 1 → Fase 2 (independientes, pueden hacerse en paralelo)
Fase 3 → Fase 4 (4 depende del useWatch configurado en 3)
Fase 5  (independiente de 3 y 4)
Fase 6  (depende de 5)
```
