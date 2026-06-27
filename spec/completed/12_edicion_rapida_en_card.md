# Spec 12 — [DONE] Edición rápida en ActivityCard

## Objetivo

Permitir editar el **nombre**, el **proyecto** y la **prioridad** de una actividad directamente desde la card, sin abrir el formulario completo. Cada campo es editable de forma independiente: al hacer clic sobre él aparece un control de edición in situ (inline), y al confirmar se guarda automáticamente via `useUpdateActivity`.

---

## Decisiones de diseño

### Patrón de interacción: inline (dentro de la card)

Se elige edición **inline** sobre la alternativa de modal de campo único porque:

- Ya existe el patrón `InlineDueDateEditor` en la misma card — la consistencia visual y de comportamiento es inmediata.
- No requiere un componente `Modal` ni manejo de z-index adicional.
- La edición de nombre y prioridad es suficientemente simple para un control inline.
- Para el proyecto (dropdown de opciones), el patrón `StatusDropdown` ya resuelto sirve como referencia directa.

### Comportamiento común a los tres campos

| Aspecto | Comportamiento |
|---|---|
| Trigger | Click sobre el elemento de visualización |
| Indicador de hover | Ícono de lápiz (`EditIcon`) que aparece con `opacity-0 group-hover:opacity-60` |
| Confirmación | `Enter` o blur (para nombre); selección de opción (para proyecto y prioridad) |
| Cancelación | `Escape` (para nombre); click fuera (para proyecto y prioridad) |
| Estado pendiente | Spinner inline mientras `isPending` |
| Sin cambio | No dispara la mutación si el valor no cambió |

### Campos en scope

| Campo | Tipo de control | Fuente de opciones |
|---|---|---|
| `name` | `<input type="text">` inline | — |
| `projectId` | Dropdown inline (como `StatusDropdown`) | `useProjects()` |
| `priority` | Dropdown inline (como `StatusDropdown`) | Opciones fijas: alta, media, baja |

### Fuera de scope

- `description` — el texto libre largo no es apto para edición inline sin un textarea; queda en el formulario completo.
- `energy`, `type`, `status` — `status` ya tiene su `StatusDropdown`; los demás quedan en el formulario.
- `dueDate` — ya tiene `InlineDueDateEditor`.

---

## Impacto arquitectural

| Capa | Archivo | Cambio |
|---|---|---|
| Componente | `frontend/src/components/ActivityCard.tsx` | Añadir tres sub-componentes internos: `InlineNameEditor`, `InlineProjectEditor`, `InlinePriorityEditor` |
| Hook existente | `useUpdateActivity` | Sin cambios — ya soporta actualizar campos individuales |
| Hook existente | `useProjects` | Sin cambios — ya está importado en `ActivityCard` (lo usa `EditActivityModal`) |
| Backend | Sin cambios | `PATCH /activities/:id` ya acepta `name`, `projectId`, `priority` parcialmente |
| Tipos | Sin cambios | `UpdateActivityDto` ya es `Partial<CreateActivityDto>` |

**No se crea ningún archivo nuevo.** Todo el cambio vive en `ActivityCard.tsx`.

---

## Fase 1 — `InlineNameEditor`

**Objetivo:** Hacer el nombre de la actividad editable con un input de texto que reemplaza el `<p>` al hacer clic.

**Especificación del componente:**

```
Props: { activity: Activity }

Estados:
  - editing: boolean (default false)
  - inputRef: RefObject<HTMLInputElement>

Comportamiento visualización:
  - Renderiza un <button> que envuelve el <p> del nombre actual
  - Al hover, aparece EditIcon con opacity-0 group-hover:opacity-60
  - Clases: mismas del <p> actual (text-sm font-semibold text-gray-900 dark:text-white)

Comportamiento edición:
  - Reemplaza el <button>/<p> por un <input type="text">
  - defaultValue: activity.name
  - Auto-focus al montar en modo edición (useEffect)
  - onBlur → commit()
  - onKeyDown: Enter → commit(); Escape → setEditing(false)
  - Spinner inline si isPending

commit():
  - Trim del valor
  - Si vacío o igual al nombre actual: setEditing(false), no mutate
  - Si cambió: mutate({ id: activity.id, dto: { name: trimmed } })
  - setEditing(false) inmediatamente (optimista — la query se refresca sola)
```

**Clases del input:**
```
w-full text-sm font-semibold bg-transparent border-b border-blue-400 dark:border-blue-500
text-gray-900 dark:text-white focus:outline-none pb-0.5
```
(Sin fondo, solo un underline, para que no rompa visualmente el layout del card.)

**Ubicación en el card:** Reemplaza directamente el `<p className="text-sm font-semibold ...">` existente (Row 2, línea del título).

---

## Fase 2 — `InlinePriorityEditor`

**Objetivo:** Hacer la prioridad editable con un dropdown inline que reemplaza el `PriorityBadge` al hacer clic, siguiendo el patrón de `StatusDropdown`.

**Especificación del componente:**

```
Props: { activity: Activity }

Estados:
  - open: boolean (default false)
  - ref: useRef<HTMLDivElement> para click-outside

Opciones:
  const PRIORITY_OPTIONS = [
    { value: 'high',   label: '↑ Alta',  dot: 'bg-red-400' },
    { value: 'medium', label: '→ Media', dot: 'bg-yellow-400' },
    { value: 'low',    label: '↓ Baja',  dot: 'bg-green-400' },
  ]

Comportamiento visualización:
  - Renderiza PriorityBadge actual + ChevronIcon + spinner condicional
  - Click abre dropdown

Comportamiento dropdown:
  - Posición: absolute, top-full, left-0, z-20
  - Click fuera: cierra (mismo useEffect que StatusDropdown)
  - Al seleccionar opción igual a la actual: cierra sin mutate
  - Al seleccionar opción distinta:
      mutate({ id: activity.id, dto: { priority } }, { onSettled: () => setOpen(false) })

Estructura del dropdown:
  - Mismo estilo visual que StatusDropdown
  - Cada opción: dot de color + label + checkmark si es la actual
```

**Ubicación en el card:** Reemplaza el `<PriorityBadge>` existente en Row 4 (línea de priority + energy).

---

## Fase 3 — `InlineProjectEditor`

**Objetivo:** Hacer el proyecto editable con un dropdown inline que reemplaza el chip de proyecto, usando `useProjects()` para la lista de opciones.

**Especificación del componente:**

```
Props: { activity: Activity }

Hooks:
  - useUpdateActivity()
  - useProjects() — ya importado en ActivityCard

Estados:
  - open: boolean (default false)
  - ref: useRef<HTMLDivElement> para click-outside

Comportamiento visualización:
  - Si activity.project: renderiza el chip de proyecto existente (Link → button)
  - Si !activity.project: renderiza un botón sutil "+ Proyecto" en gris
  - Ambos muestran ChevronIcon al hover
  - Click abre dropdown (y previene la navegación del Link)

Comportamiento dropdown:
  - Posición: absolute, top-full, left-0, z-20, min-w-[160px]
  - Click fuera: cierra
  - Opciones: "Sin proyecto" (vaciar) + lista de proyectos activos
  - Al seleccionar el mismo proyecto actual: cierra sin mutate
  - Al seleccionar:
      mutate({ id: activity.id, dto: { projectId: project?.id ?? null } }, { onSettled: () => setOpen(false) })

Estructura del dropdown:
  - Ítem "Sin proyecto": texto gris + dash (—)
  - Cada proyecto: FolderIcon + project.name
  - Checkmark en el proyecto actualmente asignado (o en "Sin proyecto" si no hay ninguno)
```

**Importante:** El chip de proyecto actualmente es un `<Link>` que navega a `/projects/:id`. Al convertirlo en trigger del dropdown, el comportamiento de navegación debe cambiar:
- Click simple → abre dropdown de edición
- El link de navegación se elimina del chip principal; si el usuario quiere ir al proyecto puede seguir usando la barra lateral o la página de proyectos.

**Alternativa si se prefiere mantener la navegación:** Agregar un ícono de lápiz separado junto al chip que abre el dropdown, y el Link sigue navegando. Decidir en implementación cuál se prefiere.

**Ubicación en el card:** Reemplaza el bloque del chip de proyecto en Row 3.

---

## Orden de implementación

Las tres fases son independientes entre sí — no hay dependencias cruzadas. Se recomienda el orden Fase 1 → Fase 2 → Fase 3 por complejidad creciente:

1. **Fase 1** (nombre) es la más simple — un input de texto sin opciones externas.
2. **Fase 2** (prioridad) introduce el patrón dropdown con datos estáticos — más simple que el proyecto.
3. **Fase 3** (proyecto) agrega datos async (`useProjects`) y la decisión sobre el comportamiento del Link.

Cada fase puede implementarse y probarse de forma aislada. El componente `ActivityCard.tsx` es el único archivo a editar.

---

## Archivos a crear

Ninguno.

## Archivos a editar

| Archivo | Cambio |
|---|---|
| `frontend/src/components/ActivityCard.tsx` | Agregar `InlineNameEditor`, `InlinePriorityEditor`, `InlineProjectEditor` como sub-componentes internos y reemplazar los elementos de visualización correspondientes |
