# Plan de Ejecucion: [DONE] Gestor de Actividades Diarias

---

## Stack Tecnologico

| Capa | Tecnologia | Justificacion |
|---|---|---|
| Framework | NestJS | Arquitectura modular, soporte nativo para DI, decoradores y TypeScript |
| Lenguaje | TypeScript | Tipado fuerte, mejor experiencia de desarrollo |
| ORM | TypeORM | Integracion nativa con NestJS, soporte para migraciones, relaciones y repositorios |
| Base de datos | PostgreSQL | Soporte robusto para relaciones, consultas complejas y tipos de datos avanzados |
| Validacion | class-validator + class-transformer | Validacion declarativa en DTOs |
| Documentacion | Swagger (OpenAPI) via `@nestjs/swagger` | Documentacion automatica de endpoints |
| Contenedores | Docker + Docker Compose | Entorno reproducible para la base de datos en desarrollo |
| Variables de entorno | `@nestjs/config` + `joi` | Gestion y validacion de configuracion |
| Testing | Jest (incluido en NestJS) | Pruebas unitarias e integracion |

---

## Fases del Proyecto

---

### ~~Fase 1 — Inicializacion y Configuracion Base~~ ✅

**Objetivo:** Tener el proyecto corriendo con conexion a base de datos funcional.

**Pasos:**
1. ✅ Crear el proyecto con Nest CLI (`nest new`)
2. ✅ Instalar dependencias: TypeORM, driver de PostgreSQL, `@nestjs/config`, `joi`, `class-validator`, `class-transformer`
3. ✅ Configurar `docker-compose.yml` con el servicio de PostgreSQL
4. ✅ Configurar archivo `.env` con variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`
5. ✅ Configurar `ConfigModule` global con validacion de schema via `joi`
6. ✅ Configurar `TypeOrmModule` en `AppModule` usando las variables de entorno
7. ✅ Verificar conexion exitosa al levantar el servidor

---

### ~~Fase 2 — Modelado de Entidades y Migraciones~~ ✅

**Objetivo:** Definir el modelo de datos completo con sus relaciones.

**Pasos:**

1. ✅ **Entidad `Project`** con campos:
   - `id` (UUID)
   - `name` (string)
   - `status` (enum: `active`, `inactive`, `paused`, `completed`)
   - `startDate` (date)
   - `endDate` (date, nullable)
   - `createdAt`, `updatedAt`

2. ✅ **Entidad `Activity`** con campos:
   - `id` (UUID)
   - `name` (string)
   - `project` (relacion ManyToOne con `Project`, nullable)
   - `actionDate` (timestamp, nullable — incluye franja horaria opcional)
   - `dueDate` (timestamp, nullable)
   - `priority` (enum: `high`, `medium`, `low`)
   - `status` (enum: `pending`, `in_progress`, `completed`, `cancelled`, `on_hold`)
   - `energy` (enum: `high`, `medium`, `low`)
   - `duration` y `durationUnit` (number + enum: `hours`, `days`)
   - `device` (enum: `phone`, `computer`, `tablet`, nullable)
   - `type` (enum: `reminder`, `event`, `task`)
   - `location` (string, nullable)
   - `parent` (relacion ManyToOne self-referencing para subtareas, nullable)
   - `subtasks` (relacion OneToMany self-referencing)
   - `createdAt`, `updatedAt`

3. ✅ Configurar TypeORM para generacion de migraciones
4. ✅ Generar y ejecutar la migracion inicial
5. ✅ Verificar la estructura de tablas en la base de datos

---

### ~~Fase 3 — Modulo de Proyectos (CRUD)~~ ✅

**Objetivo:** Exponer endpoints REST completos para la gestion de proyectos.

**Pasos:**
1. ✅ Generar modulo `projects` con Nest CLI (`nest g module`, `service`, `controller`)
2. ✅ Crear `CreateProjectDto` y `UpdateProjectDto` con validaciones via `class-validator`
3. ✅ Implementar `ProjectsService`:
   - `create(dto)`
   - `findAll()` — con opcion de filtrar por status
   - `findOne(id)`
   - `update(id, dto)`
   - `remove(id)`
4. ✅ Implementar `ProjectsController` con rutas:
   - `POST /projects`
   - `GET /projects`
   - `GET /projects/:id`
   - `PATCH /projects/:id`
   - `DELETE /projects/:id`
5. ✅ Configurar Swagger para el modulo
6. ✅ Probar endpoints manualmente

---

### ~~Fase 4 — Modulo de Actividades (CRUD)~~ ✅

**Objetivo:** Exponer endpoints REST completos para la gestion de actividades con soporte de subtareas.

**Pasos:**
1. ✅ Generar modulo `activities`
2. ✅ Crear `CreateActivityDto` y `UpdateActivityDto` con validaciones completas por cada campo
3. ✅ Implementar `ActivitiesService`:
   - `create(dto)` — soporte para asignar `projectId` y `parentId` (subtarea)
   - `findAll()` — con filtros basicos
   - `findOne(id)` — cargando relaciones (`project`, `subtasks`, `parent`)
   - `update(id, dto)`
   - `remove(id)`
4. ✅ Implementar `ActivitiesController` con rutas:
   - `POST /activities`
   - `GET /activities`
   - `GET /activities/:id`
   - `PATCH /activities/:id`
   - `DELETE /activities/:id`
5. ✅ Configurar Swagger
6. ✅ Probar endpoints y relaciones

---

### ~~Fase 5 — Consultas Especializadas~~ ✅

**Objetivo:** Implementar queries de negocio utiles para la interfaz de usuario.

**Pasos:**

1. ✅ **Actividades por proyecto:** `GET /activities/project/:projectId`
2. ✅ **Actividades de hoy:** `GET /activities/today`
3. ✅ **Actividades de manana:** `GET /activities/tomorrow`
4. ✅ **Actividades por tipo:** `GET /activities/type/:type` (task, reminder, event)
5. ✅ **Actividades por prioridad:** `GET /activities/priority/:priority`
6. ✅ **Actividades por estado:** `GET /activities/status/:status`
7. ✅ **Actividades vencidas (overdue):** `GET /activities/overdue` — dueDate anterior a hoy con estado != completed
8. ✅ **Actividades de la semana:** `GET /activities/this-week`
9. ✅ **Subtareas de una actividad:** `GET /activities/:id/subtasks`
10. ✅ Implementar cada query usando QueryBuilder de TypeORM para mayor control y eficiencia
11. ✅ Agregar parametros de paginacion (`page`, `limit`) en las consultas que retornen listas

---

### ~~Fase 6 — Configuracion Global y Buenas Practicas~~ ✅

**Objetivo:** Asegurar consistencia, manejo de errores y seguridad basica.

**Pasos:**
1. ✅ Configurar `ValidationPipe` global en `main.ts` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
2. ✅ Implementar filtro global de excepciones (`HttpExceptionFilter`) para respuestas de error uniformes
3. ✅ Definir formato de respuesta estandar (e.g. `{ data, message, statusCode }`)
4. ✅ Configurar Swagger global en `main.ts` (titulo, descripcion, version, tags)
5. ✅ Agregar prefijo global de API (`/api/v1`)
6. ✅ Configurar CORS

---

### Fase 7 — Testing

**Objetivo:** Garantizar que la logica de negocio funcione correctamente.

**Pasos:**
1. Pruebas unitarias para `ProjectsService` (mockeando el repositorio)
2. Pruebas unitarias para `ActivitiesService` (mockeando el repositorio)
3. Pruebas de integracion (e2e) para los endpoints principales usando una base de datos de test
4. Configurar script de test en `package.json`

---

## Estructura de Carpetas Propuesta

```
src/
├── activities/
│   ├── dto/
│   │   ├── create-activity.dto.ts
│   │   └── update-activity.dto.ts
│   ├── entities/
│   │   └── activity.entity.ts
│   ├── activities.controller.ts
│   ├── activities.module.ts
│   └── activities.service.ts
├── projects/
│   ├── dto/
│   │   ├── create-project.dto.ts
│   │   └── update-project.dto.ts
│   ├── entities/
│   │   └── project.entity.ts
│   ├── projects.controller.ts
│   ├── projects.module.ts
│   └── projects.service.ts
├── common/
│   ├── enums/
│   │   ├── activity-status.enum.ts
│   │   ├── activity-type.enum.ts
│   │   ├── priority.enum.ts
│   │   └── ...
│   └── filters/
│       └── http-exception.filter.ts
├── config/
│   └── database.config.ts
├── migrations/
├── app.module.ts
└── main.ts
```

---

## Orden de Ejecucion Recomendado

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
```

Las fases 3 y 4 pueden desarrollarse en paralelo una vez completada la Fase 2. La Fase 6 puede aplicarse incrementalmente desde la Fase 3.
