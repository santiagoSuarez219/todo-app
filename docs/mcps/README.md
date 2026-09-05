# Índice de MCPs — ToDo

Este archivo centraliza los MCPs activos del proyecto y el system prompt del
agente que consume cada uno. Mantenerlo actualizado ante cualquier cambio de
herramientas expuestas.

## Inventario de MCPs

| MCP | Propósito | Estado | System prompt |
|-----|-----------|--------|----------------|
| `todo-api` | Expone proyectos, actividades (incl. recurrencia) y el dominio financiero completo (gastos, ingresos, compras, cuentas, tarjetas, CDTs, presupuestos, deudas) a agentes de IA vía JSON-RPC en `/mcp` | Activo | [`asistente-personal.system-prompt.md`](./asistente-personal.system-prompt.md) (productividad) · [`finanzas-personales.system-prompt.md`](./finanzas-personales.system-prompt.md) (finanzas) |

> Ambos system prompts consumen el **mismo** servidor MCP (`todo-api`, definido
> en `backend/src/mcp/mcp.service.ts`) pero cada uno cubre un subconjunto de
> herramientas y un rol distinto: uno de productividad/calendario, otro de
> finanzas personales.

## Referencias de capacidades

Además de los system prompts (que instruyen al agente), esta carpeta tiene
documentos **descriptivos** del servidor: qué herramientas existen, con qué
parámetros y con qué límites. Útiles para revisar el contrato sin leer
`mcp.service.ts`.

| Documento | Cubre |
|---|---|
| [`finanzas-personales.capacidades.md`](./finanzas-personales.capacidades.md) | Las 42 herramientas del dominio financiero (gastos, ingresos, presupuestos, deudas, tarjetas, cuentas, CDTs, lista de deseos), con parámetros exactos, límites conocidos y trampas |

De las 68 herramientas del servidor, 42 son financieras y 26 de
proyectos/actividades.

## Autenticación (spec-021)

El endpoint `/mcp` requiere autenticación por API key:

```
Authorization: Bearer <MCP_API_KEY>
```

- `MCP_API_KEY`: token estático configurado en `.env` del backend
- El cliente MCP del agente debe incluir este header en todas las peticiones a `/mcp`
- La autenticación es **independiente** del login de usuario (credenciales distintas)
- Sin el header o con un token inválido, la respuesta es `401 Unauthorized`

**Configuración:** Define `MCP_API_KEY=<tu-token-aqui>` en `.env` (backend) y
asegúrate de que el cliente MCP del agente lo incluya en el header de cada request.

## Reglas de gestión

- Antes de implementar cualquier spec, evaluar si la funcionalidad nueva
  expone datos o acciones que un agente podría necesitar → candidato a MCP.
- Toda tool nueva o modificada en `mcp.service.ts` debe reflejarse en el
  system prompt correspondiente de esta carpeta y, si aplica, en este índice.
- Nunca eliminar una tool o el servidor MCP sin confirmar con el usuario que
  ningún agente activo la consume.
