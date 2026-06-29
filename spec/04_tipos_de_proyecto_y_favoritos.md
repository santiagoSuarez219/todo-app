# Plan de Implementacion: [DONE] Tipos de Proyecto y Campo Favorito

---

## Objetivo

Extender el sistema de gestion de proyectos con dos capacidades nuevas: (1) una tabla `project_types` con relacion `ManyToOne` desde `Project`, que permite categorizar proyectos por tipo (Desarrollo, Investigacion, Docencia, Estudio) y agregar nuevos tipos sin modificar codigo; y (2) un campo booleano `isFavorite` en `Project` para que el frontend pueda destacar proyectos favoritos del usuario.

---

## Contexto Tecnico

El backend es NestJS con TypeORM sobre PostgreSQL. El frontend es React + Vite con TailwindCSS, React Query y React Hook Form + Zod. Ya existe una capa completa de CRUD para proyectos. La entidad `Project` no tiene campo de tipo ni de favorito. Ambas adiciones son retrocompatibles — `projectTypeId` sera nullable (FK con `ON DELETE SET NULL`) e `isFavorite` tendra `DEFAULT false`.

Los 4 tipos iniciales (Desarrollo, Investigacion, Docencia, Estudio) se sembraran directamente dentro de la migracion para garantizar que existen desde el primer `migration:run`, sin necesidad de un seeder separado.

**Impacto total:** 9 archivos nuevos (6 backend, 3 frontend) + 10 archivos modificados (5 backend, 5 frontend) + 1 migracion nueva.

---

## Dependencias

No se requieren nuevas dependencias de terceros. Todos los paquetes necesarios ya estan instalados en el proyecto.

---

## Arquitectura de la solucion

### Relacion entre entidades

```
ProjectType (1) ────< (N) Project
  - Un ProjectType puede tener muchos proyectos
  - Project.projectTypeId es FK nullable → ProjectType.id
  - ON DELETE SET NULL: eliminar un tipo no elimina los proyectos
```

### Estructura de `project_types`

| Columna | Tipo | Restriccion |
|---|---|---|
| `id` | uuid | PK, `uuid_generate_v4()` |
| `name` | varchar(255) | NOT NULL, UNIQUE |
| `color` | varchar(20) | nullable — hex para badge visual en frontend |
| `createdAt` | timestamp | `DEFAULT now()` |
| `updatedAt` | timestamp | `DEFAULT now()` |

### Cambios en `projects`

| Columna nueva | Tipo | Restriccion |
|---|---|---|
| `projectTypeId` | uuid | FK nullable → `project_types.id`, `ON DELETE SET NULL` |
| `isFavorite` | boolean | NOT NULL, `DEFAULT false` |

---

## Fase 11 — Tipos de Proyecto y Favoritos

### Paso 1 — Crear la entidad ProjectType

**Archivo nuevo:** `backend/src/project-types/entities/project-type.entity.ts`

```typescript
import {
  Column, CreateDateColumn, Entity,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('project_types')
export class ProjectType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @OneToMany(() => Project, (project) => project.projectType)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Paso 2 — Crear los DTOs de ProjectType

**Archivo nuevo:** `backend/src/project-types/dto/create-project-type.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectTypeDto {
  @ApiProperty({ example: 'Desarrollo', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Color hex para badge visual' })
  @IsHexColor()
  @IsOptional()
  color?: string;
}
```

**Archivo nuevo:** `backend/src/project-types/dto/update-project-type.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProjectTypeDto } from './create-project-type.dto';

export class UpdateProjectTypeDto extends PartialType(CreateProjectTypeDto) {}
```

---

### Paso 3 — Crear el Service de ProjectType

**Archivo nuevo:** `backend/src/project-types/project-types.service.ts`

CRUD estandar sobre `Repository<ProjectType>`. Metodos:

- `create(dto: CreateProjectTypeDto): Promise<ProjectType>`
- `findAll(): Promise<ProjectType[]>` — ordenado por nombre
- `findOne(id: string): Promise<ProjectType>` — lanza `NotFoundException` si no existe
- `update(id: string, dto: UpdateProjectTypeDto): Promise<ProjectType>`
- `remove(id: string): Promise<void>` — los proyectos asociados quedaran con `projectTypeId = null` por el `ON DELETE SET NULL`

```typescript
@Injectable()
export class ProjectTypesService {
  constructor(
    @InjectRepository(ProjectType)
    private readonly repo: Repository<ProjectType>,
  ) {}

  create(dto: CreateProjectTypeDto): Promise<ProjectType> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<ProjectType[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<ProjectType> {
    const type = await this.repo.findOneBy({ id });
    if (!type) throw new NotFoundException(`ProjectType "${id}" not found`);
    return type;
  }

  async update(id: string, dto: UpdateProjectTypeDto): Promise<ProjectType> {
    const type = await this.findOne(id);
    Object.assign(type, dto);
    return this.repo.save(type);
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOne(id);
    await this.repo.remove(type);
  }
}
```

---

### Paso 4 — Crear el Controller de ProjectType

**Archivo nuevo:** `backend/src/project-types/project-types.controller.ts`

```typescript
@ApiTags('project-types')
@Controller('project-types')
export class ProjectTypesController {
  constructor(private readonly service: ProjectTypesService) {}

  @Post()
  @ApiCreatedResponse({ type: ProjectType })
  create(@Body() dto: CreateProjectTypeDto): Promise<ProjectType> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [ProjectType] })
  findAll(): Promise<ProjectType[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ProjectType })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectType> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProjectType })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectTypeDto,
  ): Promise<ProjectType> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
```

---

### Paso 5 — Crear el Module de ProjectType

**Archivo nuevo:** `backend/src/project-types/project-types.module.ts`

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([ProjectType])],
  controllers: [ProjectTypesController],
  providers: [ProjectTypesService],
  exports: [ProjectTypesService],
})
export class ProjectTypesModule {}
```

La exportacion de `ProjectTypesService` permite que `ProjectsModule` lo inyecte para resolver `projectTypeId` en la creacion/actualizacion de proyectos.

---

### Paso 6 — Migracion: crear tabla y alterar projects

**Archivo nuevo:** `backend/src/migrations/[TIMESTAMP]-CreateProjectTypesAndUpdateProjects.ts`

Generar con:
```bash
cd backend && npx typeorm migration:create src/migrations/CreateProjectTypesAndUpdateProjects
```

Contenido de `up`:

```typescript
// 1. Crear tabla project_types
await queryRunner.query(`
  CREATE TABLE "project_types" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "color" character varying(20),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_project_types_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_project_types_name" UNIQUE ("name")
  )
`);

// 2. Seed de los 4 tipos iniciales
await queryRunner.query(`
  INSERT INTO "project_types" ("name", "color") VALUES
    ('Desarrollo',    '#3B82F6'),
    ('Investigacion', '#8B5CF6'),
    ('Docencia',      '#F59E0B'),
    ('Estudio',       '#10B981')
`);

// 3. Agregar columnas a projects
await queryRunner.query(`ALTER TABLE "projects" ADD "projectTypeId" uuid`);
await queryRunner.query(`ALTER TABLE "projects" ADD "isFavorite" boolean NOT NULL DEFAULT false`);

// 4. Agregar FK con ON DELETE SET NULL
await queryRunner.query(`
  ALTER TABLE "projects"
    ADD CONSTRAINT "FK_projects_projectTypeId"
    FOREIGN KEY ("projectTypeId")
    REFERENCES "project_types"("id")
    ON DELETE SET NULL
`);
```

Contenido de `down`:

```typescript
await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_projectTypeId"`);
await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "isFavorite"`);
await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "projectTypeId"`);
await queryRunner.query(`DROP TABLE "project_types"`);
```

---

### Paso 7 — Actualizar la entidad Project

**Archivo:** `backend/src/projects/entities/project.entity.ts`

Agregar dos campos despues de `activities`:

```typescript
import { ProjectType } from '../../project-types/entities/project-type.entity';

@ManyToOne(() => ProjectType, (pt) => pt.projects, {
  nullable: true,
  onDelete: 'SET NULL',
})
projectType: ProjectType | null;

@Column({ type: 'boolean', default: false })
isFavorite: boolean;
```

---

### Paso 8 — Actualizar el DTO de creacion de Project

**Archivo:** `backend/src/projects/dto/create-project.dto.ts`

Agregar los dos campos opcionales:

```typescript
@ApiPropertyOptional({ description: 'UUID del tipo de proyecto' })
@IsUUID()
@IsOptional()
projectTypeId?: string;

@ApiPropertyOptional({ default: false })
@IsBoolean()
@IsOptional()
isFavorite?: boolean;
```

Importar `IsBoolean` de `class-validator`. `UpdateProjectDto` hereda via `PartialType` — sin cambios.

---

### Paso 9 — Actualizar ProjectsService

**Archivo:** `backend/src/projects/projects.service.ts`

**9a. Inyectar `ProjectTypesService`:**

```typescript
constructor(
  @InjectRepository(Project)
  private readonly projectsRepository: Repository<Project>,
  private readonly projectTypesService: ProjectTypesService,
) {}
```

**9b. Actualizar `create()`:**

```typescript
async create(dto: CreateProjectDto): Promise<Project> {
  const { projectTypeId, ...rest } = dto;
  const project = this.projectsRepository.create(rest);

  if (projectTypeId) {
    project.projectType = await this.projectTypesService.findOne(projectTypeId);
  }

  return this.projectsRepository.save(project);
}
```

**9c. Actualizar `findAll()` para cargar la relacion:**

```typescript
findAll(status?: ProjectStatus): Promise<Project[]> {
  const qb = this.projectsRepository
    .createQueryBuilder('project')
    .leftJoinAndSelect('project.projectType', 'projectType')
    .orderBy('project.createdAt', 'DESC');

  if (status) qb.where('project.status = :status', { status });

  return qb.getMany();
}
```

**9d. Actualizar `findOne()` para cargar la relacion:**

```typescript
async findOne(id: string): Promise<Project> {
  const project = await this.projectsRepository.findOne({
    where: { id },
    relations: { projectType: true, activities: true },
  });
  if (!project) throw new NotFoundException(`Project "${id}" not found`);
  return project;
}
```

**9e. Actualizar `update()` para manejar `projectTypeId` e `isFavorite`:**

```typescript
async update(id: string, dto: UpdateProjectDto): Promise<Project> {
  const project = await this.findOne(id);
  const { projectTypeId, ...rest } = dto;

  Object.assign(project, rest);

  if (projectTypeId !== undefined) {
    project.projectType = projectTypeId
      ? await this.projectTypesService.findOne(projectTypeId)
      : null;
  }

  return this.projectsRepository.save(project);
}
```

---

### Paso 10 — Actualizar ProjectsModule

**Archivo:** `backend/src/projects/projects.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ProjectTypesModule,         // importar para poder inyectar ProjectTypesService
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

---

### Paso 11 — Registrar ProjectTypesModule en AppModule

**Archivo:** `backend/src/app.module.ts`

```typescript
imports: [
  // ...modulos existentes...
  ProjectTypesModule,
]
```

---

### Paso 12 — Actualizar tipos del frontend

**Archivo:** `frontend/src/types/index.ts`

**12a. Nueva interfaz `ProjectType`:**

```typescript
export interface ProjectType {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**12b. Actualizar interfaz `Project`:**

```typescript
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  projectType: ProjectType | null;  // nuevo
  isFavorite: boolean;              // nuevo
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**12c. Actualizar `CreateProjectDto`:**

```typescript
export interface CreateProjectDto {
  name: string;
  status?: ProjectStatus;
  projectTypeId?: string | null;  // nuevo
  isFavorite?: boolean;           // nuevo
  startDate: string;
  endDate?: string | null;
}
```

---

### Paso 13 — Crear Service de ProjectTypes en el frontend

**Archivo nuevo:** `frontend/src/services/project-types.service.ts`

```typescript
import apiClient from '../lib/api-client';
import type { ProjectType } from '../types';

export async function getProjectTypes(): Promise<ProjectType[]> {
  const { data } = await apiClient.get<{ data: ProjectType[] }>('/project-types');
  return data.data;
}

export async function getProjectType(id: string): Promise<ProjectType> {
  const { data } = await apiClient.get<{ data: ProjectType }>(`/project-types/${id}`);
  return data.data;
}
```

---

### Paso 14 — Crear hook useProjectTypes

**Archivo nuevo:** `frontend/src/hooks/useProjectTypes.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getProjectTypes } from '../services/project-types.service';

export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: getProjectTypes,
    staleTime: 10 * 60 * 1000, // 10 min — los tipos cambian poco
  });
}
```

---

### Paso 15 — Crear componente FavoriteButton

**Archivo nuevo:** `frontend/src/components/FavoriteButton.tsx`

Boton reutilizable que emite el toggle. El padre es responsable de llamar a la mutacion.

```tsx
interface Props {
  isFavorite: boolean;
  onClick: () => void;
  loading?: boolean;
}

export default function FavoriteButton({ isFavorite, onClick, loading }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className="text-gray-300 hover:text-yellow-400 disabled:opacity-50 transition-colors"
    >
      <svg
        className={`h-5 w-5 ${isFavorite ? 'text-yellow-400 fill-current' : ''}`}
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    </button>
  );
}
```

---

### Paso 16 — Actualizar ProjectForm

**Archivo:** `frontend/src/components/ProjectForm.tsx`

**16a. Actualizar schema Zod:**

```typescript
const schema = z.object({
  // ...campos existentes...
  projectTypeId: z.string().uuid().nullish(),
  isFavorite: z.boolean().optional(),
});
```

**16b. Agregar `defaultValues`:**

```typescript
defaultValues: {
  // ...existentes...
  projectTypeId: initial?.projectType?.id ?? null,
  isFavorite: initial?.isFavorite ?? false,
}
```

**16c. Agregar campo de tipo (select con datos de `useProjectTypes`):**

```tsx
const { data: projectTypes } = useProjectTypes();

// En el formulario:
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
  <select {...register('projectTypeId')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
    <option value="">Sin tipo</option>
    {projectTypes?.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ))}
  </select>
</div>
```

**16d. Agregar checkbox de favorito:**

```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="isFavorite"
    {...register('isFavorite')}
    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
  />
  <label htmlFor="isFavorite" className="text-sm font-medium text-gray-700">
    Marcar como favorito
  </label>
</div>
```

**16e. Incluir en `toDto()`:**

```typescript
function toDto(values: FormValues): CreateProjectDto {
  return {
    ...rest,
    projectTypeId: values.projectTypeId || null,
    isFavorite: values.isFavorite ?? false,
  };
}
```

---

### Paso 17 — Actualizar ProjectList

**Archivo:** `frontend/src/pages/ProjectList.tsx`

**17a. Mostrar badge de tipo en cada tarjeta/fila:**

```tsx
{project.projectType && (
  <span
    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
    style={{ backgroundColor: project.projectType.color ?? '#6B7280' }}
  >
    {project.projectType.name}
  </span>
)}
```

**17b. Agregar `FavoriteButton` con mutacion de toggle:**

```tsx
const updateMutation = useUpdateProject();

<FavoriteButton
  isFavorite={project.isFavorite}
  loading={updateMutation.isPending}
  onClick={() => updateMutation.mutate({ id: project.id, dto: { isFavorite: !project.isFavorite } })}
/>
```

**17c. Seccion de favoritos (opcional):**

Separar la lista en dos grupos — favoritos arriba, resto abajo:

```tsx
const favorites = projects?.filter((p) => p.isFavorite) ?? [];
const others = projects?.filter((p) => !p.isFavorite) ?? [];
```

---

### Paso 18 — Actualizar ProjectDetail

**Archivo:** `frontend/src/pages/ProjectDetail.tsx`

**18a. Mostrar el tipo en el header del proyecto:**

```tsx
{project.projectType && (
  <span
    className="text-sm px-3 py-1 rounded-full text-white"
    style={{ backgroundColor: project.projectType.color ?? '#6B7280' }}
  >
    {project.projectType.name}
  </span>
)}
```

**18b. Agregar `FavoriteButton` en el header:**

```tsx
<FavoriteButton
  isFavorite={project.isFavorite}
  onClick={() => updateMutation.mutate({ id: project.id, dto: { isFavorite: !project.isFavorite } })}
/>
```

---

## Resumen de Archivos Afectados

### Backend — Nuevos

| Archivo | Accion |
|---|---|
| `backend/src/project-types/entities/project-type.entity.ts` | Crear |
| `backend/src/project-types/dto/create-project-type.dto.ts` | Crear |
| `backend/src/project-types/dto/update-project-type.dto.ts` | Crear |
| `backend/src/project-types/project-types.service.ts` | Crear |
| `backend/src/project-types/project-types.controller.ts` | Crear |
| `backend/src/project-types/project-types.module.ts` | Crear |
| `backend/src/migrations/[TS]-CreateProjectTypesAndUpdateProjects.ts` | Crear |

### Backend — Modificados

| Archivo | Cambio |
|---|---|
| `backend/src/projects/entities/project.entity.ts` | Agregar `projectType` ManyToOne e `isFavorite` |
| `backend/src/projects/dto/create-project.dto.ts` | Agregar `projectTypeId` e `isFavorite` |
| `backend/src/projects/projects.service.ts` | Inyectar `ProjectTypesService`, actualizar CRUD |
| `backend/src/projects/projects.module.ts` | Importar `ProjectTypesModule` |
| `backend/src/app.module.ts` | Registrar `ProjectTypesModule` |

### Frontend — Nuevos

| Archivo | Accion |
|---|---|
| `frontend/src/services/project-types.service.ts` | Crear |
| `frontend/src/hooks/useProjectTypes.ts` | Crear |
| `frontend/src/components/FavoriteButton.tsx` | Crear |

### Frontend — Modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/types/index.ts` | Agregar `ProjectType`, actualizar `Project` y `CreateProjectDto` |
| `frontend/src/components/ProjectForm.tsx` | Agregar select de tipo y checkbox de favorito |
| `frontend/src/pages/ProjectList.tsx` | Badge de tipo, `FavoriteButton`, separacion de favoritos |
| `frontend/src/pages/ProjectDetail.tsx` | Badge de tipo y `FavoriteButton` en header |
| `frontend/src/hooks/useProjects.ts` | Menor: nada obligatorio, opcional `useFavoriteProjects()` |

---

## Consideraciones de Riesgo

| Riesgo | Nivel | Mitigacion |
|---|---|---|
| Proyectos existentes quedan sin tipo | Bajo | `projectTypeId` nullable — ningun dato se rompe |
| Proyectos existentes cambian `isFavorite` | Ninguno | `DEFAULT false` — todos parten como no favoritos |
| Eliminar un tipo borra proyectos | Ninguno | `ON DELETE SET NULL` — proyectos quedan sin tipo, no se eliminan |
| Conflicto de modulos en NestJS | Bajo | `ProjectTypesModule` exporta el service; `ProjectsModule` lo importa |
| TypeScript errors en frontend | Bajo | Actualizar `types/index.ts` en el Paso 12 antes de los componentes |

---

## Orden de Implementacion Recomendado

1. Entidad `ProjectType` (Paso 1)
2. DTOs de `ProjectType` (Paso 2)
3. Service y Controller de `ProjectType` (Pasos 3 y 4)
4. Module de `ProjectType` (Paso 5)
5. Migracion: crear tabla, seed y alterar projects (Paso 6) — ejecutar `migration:run`
6. Actualizar entidad `Project` (Paso 7)
7. Actualizar DTO de `Project` (Paso 8)
8. Actualizar `ProjectsService` (Paso 9)
9. Actualizar `ProjectsModule` (Paso 10)
10. Registrar en `AppModule` (Paso 11)
11. Verificar endpoints con Swagger (`/api/v1/docs`)
12. Tipos frontend (Paso 12)
13. Service y hook de `ProjectType` en frontend (Pasos 13 y 14)
14. Componente `FavoriteButton` (Paso 15)
15. `ProjectForm` con tipo y favorito (Paso 16)
16. `ProjectList` con badge y toggle (Paso 17)
17. `ProjectDetail` con badge y toggle (Paso 18)
18. Prueba end-to-end del flujo completo
