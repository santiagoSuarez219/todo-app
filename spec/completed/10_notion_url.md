# Spec 10 — Enlace a Notion en actividades

## Objetivo

Agregar un campo opcional `notionUrl` a cada actividad para asociarla con una página de Notion. El enlace se muestra como un chip clicable en la tarjeta de la actividad y es editable desde el formulario.

## Decisiones de diseño

- **Una sola URL por actividad** — campo `varchar` nullable en la BD. No se crea tabla separada.
- **Solo enlace clicable** — sin integración con la API de Notion, sin consultar título de la página.
- `notionUrl` aplica a **todos los tipos** de actividad (task, event, reminder) — no condicional por tipo.

---

## Tabla de impacto arquitectural

| Capa | Archivo | Cambio |
|---|---|---|
| Base de datos | nueva migración | columna `notionUrl varchar NULL` en tabla `activities` |
| Entidad | `activity.entity.ts` | propiedad `notionUrl: string \| null` con `@Column({ nullable: true })` |
| DTO backend | `create-activity.dto.ts` | campo `notionUrl?: string \| null` con `@IsUrl @IsOptional` |
| MCP | `mcp.service.ts` | campo `notionUrl` en schemas de `create_activity` y `update_activity` |
| Tipos frontend | `src/types/index.ts` | `notionUrl: string \| null` en `Activity`; `notionUrl?: string \| null` en `CreateActivityDto` |
| Formulario | `src/components/ActivityForm.tsx` | schema Zod, defaultValues, toDto, campo JSX |
| Tarjeta | `src/components/ActivityCard.tsx` | chip enlace condicional cuando `notionUrl` tiene valor |

---

## Fase 1 — Base de datos

**Objetivo:** Agregar la columna de forma retrocompatible. Los registros existentes quedan con `NULL` y no se ve afectado ningún comportamiento actual.

**Pasos:**

1. Crear archivo de migración con timestamp `1782000000001` en `backend/src/migrations/`.
2. En el método `up`: ejecutar `ALTER TABLE "activities" ADD COLUMN "notionUrl" varchar NULL`.
3. En el método `down`: ejecutar `ALTER TABLE "activities" DROP COLUMN "notionUrl"`.
4. Ejecutar la migración contra la base de datos local con `npm run migration:run`.

> Las migraciones se auto-registran por glob — no hay que modificar `data-source.ts`.

**Archivos:**
- Crear: `backend/src/migrations/1782000000001-AddNotionUrlToActivities.ts`

---

## Fase 2 — Entidad y DTO backend

**Objetivo:** Exponer el campo en la capa de ORM y en el contrato de validación del API.

**Pasos:**

1. En `activity.entity.ts`, agregar la propiedad `notionUrl: string | null` con el decorador `@Column({ type: 'varchar', nullable: true })`.
2. En `create-activity.dto.ts`, agregar el campo `notionUrl?: string | null` con los decoradores `@IsUrl()`, `@IsOptional()` y su `@ApiPropertyOptional`. Agregar también `@IsString()` para consistencia con el resto del DTO.
3. Verificar que `sanitizeByType` en `activities.service.ts` no limpia el nuevo campo — aplica a todos los tipos, no requiere cambio en el servicio.

> `UpdateActivityDto` es `PartialType(CreateActivityDto)` — el campo queda disponible para `PATCH` sin cambio adicional.

**Archivos:**
- Editar: `backend/src/activities/entities/activity.entity.ts`
- Editar: `backend/src/activities/dto/create-activity.dto.ts`

---

## Fase 3 — MCP

**Objetivo:** Que los agentes IA puedan guardar y actualizar el enlace de Notion al crear o editar actividades.

**Pasos:**

1. En `mcp.service.ts`, en el schema Zod del tool `create_activity`, agregar `notionUrl: z.string().url().optional()` con descripción.
2. En el schema del tool `update_activity`, agregar el mismo campo como `z.string().url().nullable().optional()`.

**Archivos:**
- Editar: `backend/src/mcp/mcp.service.ts`

---

## Fase 4 — Tipos frontend

**Objetivo:** Sincronizar las interfaces TypeScript con la nueva forma de la entidad antes de tocar componentes.

**Pasos:**

1. En `src/types/index.ts`, agregar `notionUrl: string | null` a la interfaz `Activity`.
2. En `CreateActivityDto`, agregar `notionUrl?: string | null`.
3. `UpdateActivityDto` es `Partial<CreateActivityDto>` — queda actualizado automáticamente.

**Archivos:**
- Editar: `frontend/src/types/index.ts`

---

## Fase 5 — Formulario ActivityForm

**Objetivo:** Permitir al usuario ingresar, editar y limpiar el enlace de Notion desde el formulario de creación y edición.

**Pasos:**

1. En el schema Zod de `ActivityForm.tsx`, agregar `notionUrl` como `z.string().url({ message: 'Debe ser una URL válida' }).nullish()`.
2. En `defaultValues`, agregar `notionUrl: initial?.notionUrl ?? null`.
3. En la función `toDto`, incluir `notionUrl: values.notionUrl || null` para normalizar string vacío a `null`.
4. En el JSX, agregar un campo `<input type="url">` usando `inputCls` y `labelCls` existentes, con placeholder `https://www.notion.so/...`. Colocarlo después del campo `description`, fuera de cualquier bloque condicional por tipo.

**Archivos:**
- Editar: `frontend/src/components/ActivityForm.tsx`

---

## Fase 6 — Chip en ActivityCard

**Objetivo:** Mostrar el enlace de Notion de forma visual coherente con el resto de chips del card.

**Pasos:**

1. En `ActivityCard.tsx`, agregar renderizado condicional: solo cuando `activity.notionUrl` tenga valor.
2. Renderizar un elemento `<a>` con `href={activity.notionUrl}`, `target="_blank"` y `rel="noopener noreferrer"`.
3. Aplicar estilos consistentes con el chip de proyecto existente (`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border`), usando una paleta neutra (gris) o un tono distintivo de Notion.
4. Incluir un ícono de enlace externo o el logotipo de Notion (SVG inline de 12px) junto al texto "Notion".
5. Colocar el chip en la misma zona que el chip de proyecto (Row 3 del card), agrupados si ambos están presentes.

**Archivos:**
- Editar: `frontend/src/components/ActivityCard.tsx`

---

## Orden de ejecución y dependencias

```
Fase 1 (migración)
  └── Fase 2 (entidad + DTO)      ← requiere columna en BD
        ├── Fase 3 (MCP)           ← requiere campo en DTO
        └── Fase 4 (tipos TS)      ← puede ir en paralelo con Fase 2
              └── Fase 5 (Form)    ← requiere tipos actualizados
              └── Fase 6 (Card)    ← requiere tipos actualizados
```

Las Fases 5 y 6 son independientes entre sí y pueden implementarse en paralelo una vez que los tipos estén actualizados. En ningún punto intermedio el sistema queda roto: el campo tiene `NULL` por defecto y los componentes existentes no lo referencian hasta que se editen.
