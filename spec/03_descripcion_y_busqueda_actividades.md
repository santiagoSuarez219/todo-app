# Plan de Implementacion: Campo Descripcion y Busqueda de Actividades

---

## Objetivo

Extender el sistema de gestion de actividades con dos capacidades nuevas: (1) un campo de descripcion libre por actividad para almacenar detalle adicional, y (2) un motor de busqueda que filtre actividades por nombre de tarea, contenido de descripcion y nombre de proyecto desde la interfaz de usuario.

---

## Contexto Tecnico

El backend es NestJS con TypeORM sobre PostgreSQL. El frontend es React + Vite con TailwindCSS, React Query y React Hook Form + Zod. Ya existe una capa completa de endpoints REST para actividades. La entidad `Activity` no tiene campo `description`. No existe ningun endpoint ni componente de busqueda. La adicion del campo es retrocompatible — se implementara como columna nullable para no romper registros existentes.

**Impacto total:** 11 archivos modificados (5 backend, 6 frontend) + 1 archivo de migracion nuevo.

---

## Dependencias

No se requieren nuevas dependencias de terceros. Todos los paquetes necesarios ya estan instalados en el proyecto.

---

## Fase 10 — Descripcion y Busqueda de Actividades

### ✅ Paso 1 — Agregar columna `description` en la base de datos

**Archivo nuevo:** `backend/src/migrations/TIMESTAMP-AddDescriptionToActivities.ts`

Crear una nueva migracion de TypeORM con los siguientes cambios:

```typescript
// Up
await queryRunner.query(`ALTER TABLE "activities" ADD "description" text`);

// Down
await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "description"`);
```

Usar tipo `text` (sin limite de longitud a nivel DB). El limite de 5000 caracteres se aplica en capa de validacion del DTO, no en la base de datos. La columna es nullable para que registros pre-existentes no requieran actualizacion.

Generar el timestamp del archivo con:

```bash
cd backend && npx typeorm migration:create src/migrations/AddDescriptionToActivities
```

---

### ✅ Paso 2 — Actualizar la entidad Activity

**Archivo:** `backend/src/activities/entities/activity.entity.ts`

Agregar el campo `description` despues de la columna `name`:

```typescript
@Column({ type: 'text', nullable: true })
description: string | null;
```

No se requieren cambios en relaciones ni indices.

---

### ✅ Paso 3 — Actualizar el DTO de creacion

**Archivo:** `backend/src/activities/dto/create-activity.dto.ts`

Agregar el campo opcional con validacion:

```typescript
@ApiPropertyOptional({ description: 'Descripcion detallada de la actividad' })
@IsString()
@MaxLength(5000)
@IsOptional()
description?: string;
```

El `UpdateActivityDto` hereda via `PartialType(CreateActivityDto)` — no requiere cambios.

---

### ✅ Paso 4 — Agregar metodo `search` en el Service

**Archivo:** `backend/src/activities/activities.service.ts`

Agregar el metodo `search` que busca de forma case-insensitive en tres campos:

```typescript
async search(query: string, pagination: PaginationDto): Promise<Activity[]> {
  const term = query.trim();
  if (!term) return [];

  return this.paginate(
    this.baseQuery().where(
      '(activity.name ILIKE :q OR activity.description ILIKE :q OR project.name ILIKE :q)',
      { q: `%${term}%` },
    ),
    pagination,
  ).getMany();
}
```

Reutiliza `baseQuery()` (que ya incluye el join con `project`) y el helper `paginate()` existentes. TypeORM parametriza la query automaticamente — sin riesgo de inyeccion SQL.

---

### ✅ Paso 5 — Agregar endpoint `search` en el Controller

**Archivo:** `backend/src/activities/activities.controller.ts`

Agregar el endpoint antes de `GET /activities/:id` para evitar conflicto de rutas en NestJS:

```typescript
@Get('search/:query')
@ApiOperation({ summary: 'Buscar actividades por nombre, descripcion o proyecto' })
@ApiParam({ name: 'query', type: String })
@ApiOkResponse({ type: [Activity] })
search(
  @Param('query') query: string,
  @Query() pagination: PaginationDto,
): Promise<Activity[]> {
  return this.activitiesService.search(query, pagination);
}
```

**Orden de rutas en el controller (critico):**

```
GET /activities               → findAll
GET /activities/today         → findToday
GET /activities/tomorrow      → findTomorrow
GET /activities/this-week     → findThisWeek
GET /activities/overdue       → findOverdue
GET /activities/search/:query → search        ← NUEVO, debe ir aqui
GET /activities/project/:id   → findByProject
GET /activities/type/:type    → findByType
GET /activities/priority/:p   → findByPriority
GET /activities/status/:s     → findByStatus
GET /activities/:id/subtasks  → findSubtasks
GET /activities/:id           → findOne       ← rutas dinamicas al final
PATCH /activities/:id         → update
DELETE /activities/:id        → remove
```

Si `search/:query` se coloca despues de `/:id`, NestJS interceptara la peticion y buscara una actividad con id `"search"`.

---

### ✅ Paso 6 — Actualizar tipos del frontend

**Archivo:** `frontend/src/types/index.ts`

Agregar `description` a la interfaz `Activity` y al DTO de creacion:

```typescript
// En la interfaz Activity
description: string | null;

// En CreateActivityDto
description?: string;
```

`UpdateActivityDto` hereda de `Partial<CreateActivityDto>` — no requiere cambios.

---

### ✅ Paso 7 — Agregar funcion de busqueda en el Service del frontend

**Archivo:** `frontend/src/services/activities.service.ts`

Agregar la funcion que consume el nuevo endpoint:

```typescript
export async function searchActivities(
  query: string,
  params?: PaginationParams,
): Promise<Activity[]> {
  return getList(`/activities/search/${encodeURIComponent(query)}`, params);
}
```

`encodeURIComponent` maneja caracteres especiales en el termino de busqueda.

---

### ✅ Paso 8 — Agregar hook `useSearchActivities`

**Archivo:** `frontend/src/hooks/useActivities.ts`

Agregar el hook de React Query para la busqueda:

```typescript
export function useSearchActivities(query: string, params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'search', query, params],
    queryFn: () => searchActivities(query, params),
    enabled: query.trim().length > 0,
  });
}
```

La opcion `enabled: query.trim().length > 0` evita llamadas al backend con queries vacias.

---

### ✅ Paso 9 — Agregar campo `description` al formulario de actividad

**Archivo:** `frontend/src/components/ActivityForm.tsx` (o el componente equivalente de formulario)

**9a. Actualizar schema Zod:**

```typescript
const activitySchema = z.object({
  // ...campos existentes...
  description: z.string().max(5000).optional(),
});
```

**9b. Agregar textarea en el formulario:**

```tsx
<div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Descripcion
  </label>
  <textarea
    {...register('description')}
    rows={3}
    placeholder="Detalle adicional sobre la actividad..."
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

**9c. Incluir en `defaultValues` y en el objeto enviado al DTO:** el campo `description` debe mapearse desde el objeto de actividad inicial y enviarse en la mutacion de creacion/actualizacion.

---

### ✅ Paso 10 — Mostrar descripcion en ActivityCard

**Archivo:** `frontend/src/components/ActivityCard.tsx`

Agregar preview de descripcion truncada cuando existe:

```tsx
{activity.description && (
  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
    {activity.description}
  </p>
)}
```

`line-clamp-2` (TailwindCSS) limita el preview a 2 lineas con ellipsis automatico.

---

### ✅ Paso 11 — Agregar barra de busqueda en ActivityList

**Archivo:** `frontend/src/pages/ActivityList.tsx`

**11a. Agregar estado de busqueda:**

```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 300); // evitar llamadas por cada keystroke

const { data: searchResults, isLoading: isSearching } = useSearchActivities(debouncedQuery);
const { data: allActivities, isLoading } = useActivities(pagination);

const activities = debouncedQuery.trim() ? searchResults : allActivities;
```

**11b. Agregar input de busqueda en el header de la pagina:**

```tsx
<div className="relative">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Buscar por tarea, descripcion o proyecto..."
    className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

**11c. Mostrar badge cuando hay busqueda activa:**

```tsx
{debouncedQuery && (
  <span className="text-sm text-gray-500">
    {activities?.length ?? 0} resultado(s) para "{debouncedQuery}"
  </span>
)}
```

Si el proyecto no tiene un hook `useDebounce`, implementarlo o instalar `use-debounce`:

```bash
cd frontend && npm install use-debounce
```

---

## Resumen de Archivos Afectados

### Backend

| Archivo | Accion |
|---|---|
| `backend/src/migrations/TIMESTAMP-AddDescriptionToActivities.ts` | Crear — nueva migracion |
| `backend/src/activities/entities/activity.entity.ts` | Modificar — agregar campo `description` |
| `backend/src/activities/dto/create-activity.dto.ts` | Modificar — agregar campo `description` |
| `backend/src/activities/activities.service.ts` | Modificar — agregar metodo `search()` |
| `backend/src/activities/activities.controller.ts` | Modificar — agregar endpoint `GET /activities/search/:query` |

### Frontend

| Archivo | Accion |
|---|---|
| `frontend/src/types/index.ts` | Modificar — agregar `description` a `Activity` y `CreateActivityDto` |
| `frontend/src/services/activities.service.ts` | Modificar — agregar `searchActivities()` |
| `frontend/src/hooks/useActivities.ts` | Modificar — agregar `useSearchActivities()` |
| `frontend/src/components/ActivityForm.tsx` | Modificar — agregar campo `description` al schema y UI |
| `frontend/src/components/ActivityCard.tsx` | Modificar — mostrar preview de `description` |
| `frontend/src/pages/ActivityList.tsx` | Modificar — agregar barra de busqueda y logica de alternancia |

---

## Consideraciones de Riesgo

| Riesgo | Nivel | Mitigacion |
|---|---|---|
| Perdida de datos en migracion | Bajo | Columna nullable — registros existentes quedan con `description = null` |
| Conflicto de rutas en NestJS | Medio | Colocar `search/:query` antes de `/:id` en el controller |
| Inyeccion SQL en busqueda | Bajo | TypeORM parametriza automaticamente con `{ q: \`%${term}%\` }` |
| Llamadas excesivas al backend por keystroke | Bajo | Debounce de 300ms antes de disparar la query |
| Resultados inesperados con caracteres especiales en URL | Bajo | `encodeURIComponent` en el service del frontend |

---

## Orden de Implementacion Recomendado

1. Migracion de base de datos (Paso 1)
2. Entidad + DTOs backend (Pasos 2 y 3)
3. Service + Controller backend (Pasos 4 y 5)
4. Verificar endpoints con Swagger (`/api/v1/docs`)
5. Tipos frontend (Paso 6)
6. Service + Hook frontend (Pasos 7 y 8)
7. ActivityForm con campo description (Paso 9)
8. ActivityCard con preview (Paso 10)
9. ActivityList con busqueda (Paso 11)
10. Prueba end-to-end del flujo completo
