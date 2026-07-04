import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // ─── Allow Swagger/OpenAPI docs ───────────────────────────────────────────
    if (
      request.path === '/api/v1/docs' ||
      request.path === '/api/v1/docs-json' ||
      request.path.startsWith('/api/v1/docs/')
    ) {
      return true;
    }

    // ─── Check if route is /mcp ───────────────────────────────────────────────
    if (request.path === '/mcp' || request.path.startsWith('/mcp/')) {
      return this.validateMcpApiKey(request);
    }

    // ─── Check if route is marked as @Public() ────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // ─── Validate JWT from cookie ─────────────────────────────────────────────
    return this.validateJwtFromCookie(request);
  }

  private validateMcpApiKey(request: Request): boolean {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const mcpApiKey = this.configService.get<string>('MCP_API_KEY');

    if (!mcpApiKey || token !== mcpApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private validateJwtFromCookie(request: Request): boolean {
    const token = request.cookies?.auth_token;

    if (!token) {
      throw new UnauthorizedException('Missing authentication cookie');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      // Attach user to request for use in controllers
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
