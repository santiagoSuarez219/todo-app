# Gestor de Actividades Diarias — Backend

API REST construida con NestJS y PostgreSQL para gestionar actividades diarias: tareas, recordatorios y eventos.

## Stack

- **Framework:** NestJS + TypeScript
- **ORM:** TypeORM
- **Base de datos:** PostgreSQL
- **Documentacion:** Swagger / OpenAPI
- **Contenedores:** Docker + Docker Compose

## Requisitos

- Node.js >= 20
- npm >= 10
- Docker y Docker Compose

## Instalacion

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raiz del proyecto basado en `.env.example`:

```bash
cp .env.example .env
```

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecucion | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de la base de datos | `localhost` |
| `DB_PORT` | Puerto de la base de datos | `5432` |
| `DB_NAME` | Nombre de la base de datos | `todo_db` |
| `DB_USER` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contrasena de la base de datos | `postgres` |

## Base de datos

Levantar PostgreSQL con Docker:

```bash
docker compose up -d
```

Ejecutar migraciones:

```bash
npm run migration:run
```

## Ejecutar el proyecto

```bash
# Desarrollo con hot reload
npm run start:dev

# Produccion
npm run start:prod
```

El servidor estara disponible en `http://localhost:3000`.

## Documentacion API

Con el servidor corriendo, accede a Swagger en:

```
http://localhost:3000/api/docs
```

## Endpoints principales

### Proyectos — `/api/v1/projects`

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/projects` | Listar todos los proyectos |
| `POST` | `/projects` | Crear un proyecto |
| `GET` | `/projects/:id` | Obtener un proyecto por ID |
| `PATCH` | `/projects/:id` | Actualizar un proyecto |
| `DELETE` | `/projects/:id` | Eliminar un proyecto |

### Actividades — `/api/v1/activities`

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/activities` | Listar todas las actividades |
| `POST` | `/activities` | Crear una actividad |
| `GET` | `/activities/:id` | Obtener una actividad por ID |
| `PATCH` | `/activities/:id` | Actualizar una actividad |
| `DELETE` | `/activities/:id` | Eliminar una actividad |
| `GET` | `/activities/today` | Actividades de hoy |
| `GET` | `/activities/tomorrow` | Actividades de manana |
| `GET` | `/activities/this-week` | Actividades de la semana |
| `GET` | `/activities/overdue` | Actividades vencidas |
| `GET` | `/activities/project/:id` | Actividades por proyecto |
| `GET` | `/activities/type/:type` | Actividades por tipo |
| `GET` | `/activities/status/:status` | Actividades por estado |
| `GET` | `/activities/priority/:priority` | Actividades por prioridad |
| `GET` | `/activities/:id/subtasks` | Subtareas de una actividad |

## Tests

```bash
# Pruebas unitarias
npm run test

# Pruebas e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## Estructura del proyecto

```
src/
├── activities/
│   ├── dto/
│   ├── entities/
│   ├── activities.controller.ts
│   ├── activities.module.ts
│   └── activities.service.ts
├── projects/
│   ├── dto/
│   ├── entities/
│   ├── projects.controller.ts
│   ├── projects.module.ts
│   └── projects.service.ts
├── common/
│   ├── enums/
│   └── filters/
├── config/
├── migrations/
├── app.module.ts
└── main.ts
```
