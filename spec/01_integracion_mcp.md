# Plan de Implementacion: [DONE] Integracion MCP (Model Context Protocol)

---

## Objetivo

Exponer la API REST del gestor de actividades como un servidor MCP (Model Context Protocol), permitiendo que chatbots (Claude Desktop, Cursor, etc.) interactuen directamente con proyectos y actividades mediante herramientas estructuradas.

---

## Contexto Tecnico

MCP es el protocolo estandar para exponer herramientas a LLMs. El servidor MCP recibe llamadas del chatbot, ejecuta la logica correspondiente y devuelve el resultado.

**Transporte elegido:** Streamable HTTP (SSE) — apropiado para servidores remotos accesibles por red.

**Ventaja clave:** Los `ProjectsService` y `ActivitiesService` ya estan bien encapsulados e inyectables. El modulo MCP los reutiliza directamente sin modificar la logica de negocio existente.

---

## Dependencias

| Paquete | Descripcion |
|---|---|
| `@modelcontextprotocol/sdk` | SDK oficial para implementar servidores MCP en TypeScript |

---

## Fase 8 — Integracion MCP

### Paso 1 — Instalar dependencia

```bash
npm install @modelcontextprotocol/sdk
```

---

### Paso 2 — Crear `McpModule`

**Archivo:** `backend/src/mcp/mcp.module.ts`

- Importar `ProjectsModule` y `ActivitiesModule` para acceder a sus servicios
- Declarar `McpService` y `McpController`

---

### Paso 3 — Implementar `McpService`

**Archivo:** `backend/src/mcp/mcp.service.ts`

Responsabilidades:
- Instanciar el `McpServer` del SDK con nombre y version
- Registrar todas las tools usando `server.tool(name, schema, handler)`
- Cada handler inyecta y llama al metodo correspondiente del servicio NestJS

**Tools a registrar (~19 herramientas):**

#### Tools de Proyectos

| Nombre de la Tool | Metodo del servicio | Parametros |
|---|---|---|
| `list_projects` | `ProjectsService.findAll()` | `status?` (enum opcional) |
| `get_project` | `ProjectsService.findOne(id)` | `id` (UUID) |
| `create_project` | `ProjectsService.create(dto)` | `name`, `status`, `startDate`, `endDate?` |
| `update_project` | `ProjectsService.update(id, dto)` | `id` + campos opcionales del proyecto |
| `delete_project` | `ProjectsService.remove(id)` | `id` (UUID) |

#### Tools de Actividades — CRUD

| Nombre de la Tool | Metodo del servicio | Parametros |
|---|---|---|
| `list_activities` | `ActivitiesService.findAll()` | `page?`, `limit?` |
| `get_activity` | `ActivitiesService.findOne(id)` | `id` (UUID) |
| `create_activity` | `ActivitiesService.create(dto)` | Todos los campos del `CreateActivityDto` |
| `update_activity` | `ActivitiesService.update(id, dto)` | `id` + campos opcionales del `UpdateActivityDto` |
| `delete_activity` | `ActivitiesService.remove(id)` | `id` (UUID) |

#### Tools de Actividades — Consultas Especializadas

| Nombre de la Tool | Metodo del servicio | Parametros |
|---|---|---|
| `get_today_activities` | `ActivitiesService.findToday()` | `page?`, `limit?` |
| `get_tomorrow_activities` | `ActivitiesService.findTomorrow()` | `page?`, `limit?` |
| `get_this_week_activities` | `ActivitiesService.findThisWeek()` | `page?`, `limit?` |
| `get_overdue_activities` | `ActivitiesService.findOverdue()` | `page?`, `limit?` |
| `get_activities_by_project` | `ActivitiesService.findByProject()` | `projectId` (UUID), `page?`, `limit?` |
| `get_activities_by_type` | `ActivitiesService.findByType()` | `type` (enum), `page?`, `limit?` |
| `get_activities_by_priority` | `ActivitiesService.findByPriority()` | `priority` (enum), `page?`, `limit?` |
| `get_activities_by_status` | `ActivitiesService.findByStatus()` | `status` (enum), `page?`, `limit?` |
| `get_activity_subtasks` | `ActivitiesService.findSubtasks()` | `id` (UUID), `page?`, `limit?` |

---

### Paso 4 — Implementar `McpController`

**Archivo:** `backend/src/mcp/mcp.controller.ts`

- Exponer endpoint `POST /mcp` para el transporte Streamable HTTP
- Manejar el flujo SSE usando el `StreamableHTTPServerTransport` del SDK
- El controlador delega completamente al `McpService` para conectar el transporte al servidor MCP

---

### Paso 5 — Ajustar `main.ts`

**Archivo:** `backend/src/main.ts`

Cambios necesarios:
1. Excluir `/mcp` del prefijo global `api/v1` usando la opcion `exclude` de `setGlobalPrefix`
2. Excluir `/mcp` del `ValidationPipe` global (el MCP maneja su propia validacion via JSON Schema)

```typescript
app.setGlobalPrefix(API_PREFIX, {
  exclude: [{ path: 'mcp', method: RequestMethod.POST }],
});
```

---

### Paso 6 — Registrar `McpModule` en `AppModule`

**Archivo:** `backend/src/app.module.ts`

Agregar `McpModule` a los imports del `AppModule`.

---

### Paso 7 — Verificar integracion

Opciones para probar el servidor MCP:

1. **MCP Inspector** (herramienta oficial): `npx @modelcontextprotocol/inspector`
2. **Claude Desktop**: configurar en `claude_desktop_config.json` apuntando al endpoint `/mcp`
3. **Cliente HTTP manual**: enviar requests JSON-RPC al endpoint `POST /mcp`

---

## Estructura de Carpetas Resultante

```
src/
├── mcp/
│   ├── mcp.module.ts
│   ├── mcp.service.ts
│   └── mcp.controller.ts
├── activities/
├── projects/
├── common/
├── app.module.ts
└── main.ts
```

---

## Resumen de Impacto por Componente

| Componente | Tipo de cambio | Descripcion |
|---|---|---|
| `package.json` | Agregar dependencia | `@modelcontextprotocol/sdk` |
| `src/mcp/` | Crear modulo nuevo | 3 archivos: module, service, controller |
| `app.module.ts` | Modificacion menor | Agregar `McpModule` a imports |
| `main.ts` | Modificacion menor | Excluir `/mcp` del prefix global y ValidationPipe |
| `ProjectsService` | Sin cambios | Reutilizado directamente por McpService |
| `ActivitiesService` | Sin cambios | Reutilizado directamente por McpService |

---

## Orden de Ejecucion

```
Paso 1 (dependencia) → Paso 2 (module) → Paso 3 (service + tools) → Paso 4 (controller) → Paso 5 (main.ts) → Paso 6 (AppModule) → Paso 7 (verificacion)
```
