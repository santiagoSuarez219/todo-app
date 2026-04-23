import { Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  /**
   * Main MCP endpoint — handles JSON-RPC requests and returns tool results.
   * Each request creates its own transport and server instance (stateless mode).
   */
  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = this.mcpService.createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('finish', () => server.close());
  }

  /**
   * SSE endpoint — allows chatbot clients to receive server-sent events.
   */
  @Get()
  async handleGet(@Req() req: Request, @Res() res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = this.mcpService.createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
    res.on('finish', () => server.close());
  }

  /**
   * Session termination endpoint.
   */
  @Delete()
  async handleDelete(@Req() req: Request, @Res() res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = this.mcpService.createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
    res.on('finish', () => server.close());
  }
}
