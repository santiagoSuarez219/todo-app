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

## Reglas de gestión

- Antes de implementar cualquier spec, evaluar si la funcionalidad nueva
  expone datos o acciones que un agente podría necesitar → candidato a MCP.
- Toda tool nueva o modificada en `mcp.service.ts` debe reflejarse en el
  system prompt correspondiente de esta carpeta y, si aplica, en este índice.
- Nunca eliminar una tool o el servidor MCP sin confirmar con el usuario que
  ningún agente activo la consume.
