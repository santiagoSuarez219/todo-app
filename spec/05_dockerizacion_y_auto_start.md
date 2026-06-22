# Plan de Implementacion: [DONE] Dockerizacion Full-Stack y Auto-Start

---

## Objetivo

Containerizar el backend (NestJS) y el frontend (React + Vite) en Docker, unificarlos con el servicio de PostgreSQL ya existente en un unico `docker-compose.yml`, y configurar el sistema para que los tres servicios arranquen automaticamente al encender la computadora mediante Docker Desktop.

---

## Contexto Tecnico

El proyecto tiene tres componentes: frontend React en puerto 5173 (dev), backend NestJS en puerto 3000, y PostgreSQL 16 en puerto 5433 externo / 5432 interno. El `docker-compose.yml` actual solo contiene el servicio de PostgreSQL. No existen Dockerfiles ni `.dockerignore` para el backend ni el frontend.

**Problema critico con Vite:** Las variables `VITE_*` se incrustan en el bundle en tiempo de build, no de ejecucion. `VITE_API_URL` quedaria hardcodeada apuntando a `localhost:3000`, lo que rompe el enrutamiento dentro de Docker. La solucion es reemplazar la URL absoluta por rutas relativas y usar Nginx como reverse proxy que resuelva las llamadas en runtime.

**Auto-start en Mac:** Docker Desktop tiene la opcion "Start Docker when you log in". Con `restart: unless-stopped` en todos los servicios, Docker los levanta automaticamente al arrancar. No se necesita launchd, cron ni Launch Agents.

**Impacto total:** 7 archivos nuevos, 4 archivos modificados. Ningun cambio afecta logica de negocio ni componentes React.

---

## Dependencias entre Fases

```
Fase 1 ──┐
          ├──> Fase 3 ──> Fase 4 ──> Fase 5
Fase 2 ──┘
```

Las fases 1 y 2 son independientes y pueden ejecutarse en cualquier orden. Las fases 3, 4 y 5 requieren que las anteriores esten completas.

---

## Fase 1 — Preparacion del Frontend

**Objetivo:** Eliminar la dependencia de `VITE_API_URL` como variable de entorno incrustada en el bundle. El frontend pasara a usar rutas relativas que Nginx resuelve en tiempo de ejecucion. El desarrollo local se mantiene intacto mediante el proxy de Vite.

### ✅ Paso 1.1 — Modificar `frontend/src/lib/api-client.ts`

Cambiar el `baseURL` de Axios de `import.meta.env.VITE_API_URL` a la ruta relativa literal `/api/v1`. Con un `baseURL` relativo, Axios envia las peticiones al mismo origen desde el que se sirve el frontend. En desarrollo lo atiende el proxy de Vite; en produccion Docker lo atiende Nginx.

### ✅ Paso 1.2 — Modificar `frontend/vite.config.ts`

Agregar una seccion `server.proxy` que redirija `/api/v1` y `/mcp` hacia `http://localhost:3000` durante el desarrollo local. Esto replica en desarrollo el mismo comportamiento que tendra Nginx en Docker. El flujo `npm run dev` queda intacto sin necesidad de Docker.

### ✅ Paso 1.3 — Modificar `frontend/.env.local`

Eliminar o comentar la variable `VITE_API_URL` con una nota explicativa de que fue removida intencionalmente al migrar a rutas relativas.

**Punto de atencion:** Hacer una busqueda global en el frontend de cualquier otra referencia a `import.meta.env.VITE_API_URL` antes de continuar.

---

## Fase 2 — Preparacion del Backend

**Objetivo:** Hacer que el backend ejecute las migraciones de base de datos automaticamente al arrancar dentro del contenedor, y ajustar la configuracion de NestJS para el entorno Docker.

### ✅ Paso 2.1 — Crear `backend/entrypoint.sh`

Script de shell que ejecuta secuencialmente `npm run migration:run` y luego `node dist/main`. Si la migracion falla, el contenedor se detiene y no levanta el servidor. Debe tener permisos de ejecucion.

### ✅ Paso 2.2 — Modificar `backend/src/app.module.ts`

Agregar logica condicional en `ConfigModule` para que no intente leer el archivo `.env` cuando `NODE_ENV=production`. En Docker, las variables son inyectadas directamente por Docker Compose via `environment:`. Intentar leer un archivo inexistente no crashea NestJS pero genera warnings y puede ocultar errores de configuracion.

### ✅ Paso 2.3 — Crear `backend/.dockerignore`

Excluir `node_modules/`, `dist/`, `.env`, archivos de test, `coverage/` y `.git`. Reduce el contexto de build y evita que credenciales locales entren al contenedor.

**Punto de atencion:** Verificar que la ruta al `DataSource` compilado en `dist/` sea correcta para el entorno del contenedor, ya que `data-source.ts` usa rutas relativas para localizar el `.env` al correr migraciones via CLI.

---

## Fase 3 — Creacion de Dockerfiles

**Objetivo:** Definir las imagenes de produccion para backend y frontend usando builds multi-etapa. El objetivo de tamano es backend menor a 300 MB y frontend menor a 50 MB.

**Dependencia:** Fases 1 y 2 completas.

### ✅ Paso 3.1 — Crear `backend/Dockerfile`

Build en dos etapas:

- **Etapa `builder`:** imagen base `node:20-alpine`. Instala todas las dependencias (incluyendo devDependencies). Ejecuta `npm run build` para compilar TypeScript a `dist/`.
- **Etapa `production`:** imagen base `node:20-alpine` limpia. Copia solo `dist/`, `package.json` y `package-lock.json` desde el builder. Instala unicamente dependencias de produccion con `npm ci --omit=dev`. Copia `entrypoint.sh`. Expone el puerto 3000. Define `ENTRYPOINT` apuntando al script de entrypoint.

### ✅ Paso 3.2 — Crear `frontend/Dockerfile`

Build en dos etapas:

- **Etapa `builder`:** imagen base `node:20-alpine`. Instala dependencias y ejecuta `npm run build`. No requiere ninguna variable `VITE_*` porque las URLs ya son rutas relativas desde la Fase 1. La salida queda en `dist/`.
- **Etapa `production`:** imagen base `nginx:alpine`. Copia el `dist/` del builder al directorio de estaticos de Nginx (`/usr/share/nginx/html`). Copia `nginx.conf` a la configuracion de Nginx. Expone el puerto 80.

### ✅ Paso 3.3 — Crear `frontend/.dockerignore`

Excluir `node_modules/`, `dist/`, `.env.local`, `.git`. Similar al del backend.

---

## Fase 4 — Configuracion de Nginx

**Objetivo:** Crear la configuracion de Nginx que sirva los archivos estaticos del frontend y actue como reverse proxy hacia el backend para las rutas de API y MCP.

**Dependencia:** Fase 3 completa.

### ✅ Paso 4.1 — Crear `nginx.conf`

Definir un bloque `server` en el puerto 80 con tres tipos de `location`:

- **`/api/v1/`:** proxy hacia `http://backend:3000` (nombre del servicio en Docker Compose). Incluir headers de proxy estandar (`Host`, `X-Real-IP`, `X-Forwarded-For`).
- **`/mcp`:** proxy hacia `http://backend:3000`. El endpoint MCP usa Server-Sent Events (SSE), por lo que se debe desactivar el buffering de proxy (`proxy_buffering off`) y configurar timeouts altos. Sin este ajuste, Nginx cierra las conexiones SSE de larga duracion silenciosamente a los 60 segundos.
- **`/`:** sirve los archivos estaticos desde `/usr/share/nginx/html` con `try_files $uri $uri/ /index.html` para que React Router pueda manejar la navegacion del lado del cliente sin producir 404 al recargar una ruta interna.

**Riesgo critico — SSE/MCP:** Configurar `proxy_read_timeout` y `proxy_send_timeout` a un valor alto (minimo 3600 segundos) exclusivamente para el bloque `location /mcp`. Sin este ajuste el servidor MCP pierde conexiones de forma silenciosa.

---

## Fase 5 — Integracion en Docker Compose

**Objetivo:** Unificar los tres servicios con el orden correcto de arranque, una red interna compartida, y `restart: unless-stopped` en todos para garantizar el auto-start.

**Dependencia:** Fases 3 y 4 completas.

### ✅ Paso 5.1 — Modificar `docker-compose.yml`

Reestructurar el archivo para incluir los tres servicios y una red interna:

- **Servicio `postgres` (ya existe):** Agregar `healthcheck` con `pg_isready` para que los otros servicios puedan declarar dependencia real sobre la disponibilidad de la base de datos y no solo sobre el inicio del contenedor. Mantener `restart: unless-stopped`.

- **Servicio `backend` (nuevo):** Apuntar al `backend/Dockerfile`. Declarar `depends_on` con condicion `service_healthy` sobre `postgres`. Esto garantiza que las migraciones del entrypoint no fallen por una DB aun no disponible, sin necesitar scripts externos como `wait-for-it.sh`. Definir variables de entorno: `DB_HOST=postgres` (nombre del servicio, no localhost), `DB_PORT=5432` (puerto interno del contenedor), `NODE_ENV=production`, y las demas variables de conexion. Agregar `restart: unless-stopped`.

- **Servicio `frontend` (nuevo):** Apuntar al `frontend/Dockerfile`. Declarar `depends_on` con condicion `service_started` sobre `backend`. Mapear el puerto `80:80` para acceso desde el host. Agregar `restart: unless-stopped`.

- **Red interna:** Declarar una red de tipo `bridge` compartida entre los tres servicios. Los contenedores se comunican entre si por nombre de servicio. Solo el servicio `frontend` necesita exponer un puerto al host.

### ✅ Paso 5.2 — Gestionar variables de entorno para Docker

Crear un archivo `.env.docker` separado del `.env` de desarrollo con los valores correctos para el entorno containerizado (`DB_HOST=postgres`, `DB_PORT=5432`, `NODE_ENV=production`, `FRONTEND_URL=http://localhost`). Referenciar este archivo en Docker Compose con `env_file`. El archivo `.env.docker` no debe commitearse a git — agregar la entrada correspondiente al `.gitignore`.

El `.env` de desarrollo local permanece sin cambios para que `npm run dev` y `npm run start:dev` sigan funcionando igual.

### ✅ Paso 5.3 — Configurar auto-start en Docker Desktop

Activar la opcion "Start Docker when you log in" en las preferencias de Docker Desktop. Con `restart: unless-stopped` en los tres servicios, Docker los levantara automaticamente cada vez que arranque la Mac. No se requiere ningun paso adicional en el sistema operativo.

---

## Resumen de Archivos Afectados

### Archivos nuevos

| Archivo | Descripcion |
|---|---|
| `backend/Dockerfile` | Imagen multi-etapa de produccion para NestJS |
| `backend/entrypoint.sh` | Script de arranque: migraciones + servidor |
| `backend/.dockerignore` | Exclusiones del contexto de build del backend |
| `frontend/Dockerfile` | Imagen multi-etapa de produccion para React + Nginx |
| `frontend/.dockerignore` | Exclusiones del contexto de build del frontend |
| `nginx.conf` | Configuracion de Nginx: estaticos + reverse proxy |
| `.env.docker` | Variables de entorno para el entorno Docker (no commitear) |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `docker-compose.yml` | Agregar servicios `backend` y `frontend`, healthcheck en postgres, red interna |
| `frontend/src/lib/api-client.ts` | Reemplazar `VITE_API_URL` por ruta relativa `/api/v1` |
| `frontend/vite.config.ts` | Agregar `server.proxy` para desarrollo local |
| `backend/src/app.module.ts` | Condicionar carga del `.env` segun `NODE_ENV` |

---

## Consideraciones de Riesgo

| Riesgo | Nivel | Mitigacion |
|---|---|---|
| Conexiones SSE del MCP cortadas por Nginx | Alto | Configurar `proxy_buffering off` y timeouts altos solo en `location /mcp` |
| Migracion falla si la DB no esta lista | Medio | `depends_on` con `service_healthy` y `pg_isready` en el healthcheck de postgres |
| Variables `VITE_*` hardcodeadas en el bundle | Alto | Reemplazar por rutas relativas en Fase 1 antes de crear los Dockerfiles |
| Ruta relativa del `.env` en `data-source.ts` invalida dentro del contenedor | Medio | Verificar la ruta compilada en `dist/` y ajustar si es necesario |
| Credenciales en `.env.docker` commiteadas por error | Medio | Agregar `.env.docker` al `.gitignore` en el Paso 5.2 |
| Imagenes de gran tamano por no usar multi-stage | Bajo | Los Dockerfiles usan multi-stage obligatoriamente |

---

## Orden de Implementacion Recomendado

1. Fase 1: ajustar frontend para rutas relativas y proxy Vite
2. Fase 2: crear entrypoint del backend y ajustar ConfigModule
3. Verificar que el desarrollo local sigue funcionando (`npm run dev` + `npm run start:dev`)
4. Fase 3: crear los Dockerfiles de backend y frontend
5. Fase 4: crear `nginx.conf`
6. Fase 5: actualizar `docker-compose.yml` y crear `.env.docker`
7. Ejecutar `docker compose up --build` por primera vez y verificar logs con `docker compose logs -f`
8. Verificar migraciones ejecutadas correctamente en los logs del backend
9. Probar la aplicacion en `http://localhost`
10. Activar "Start Docker when you log in" en Docker Desktop y reiniciar para confirmar el auto-start
