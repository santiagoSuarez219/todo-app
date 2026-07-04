import { NestFactory, Reflector } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

const API_PREFIX = 'api/v1';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global prefix ──────────────────────────────────────────────────────────
  // /mcp is excluded so the MCP endpoint does not get the api/v1 prefix
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'mcp', method: RequestMethod.POST },
      { path: 'mcp', method: RequestMethod.GET },
      { path: 'mcp', method: RequestMethod.DELETE },
    ],
  });

  // ─── Cookie Parser ──────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // ─── Validation ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Global filter & interceptor ────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ToDo API')
    .setDescription('API REST para el gestor de actividades diarias')
    .setVersion('1.0')
    .addTag('projects', 'Gestión de proyectos')
    .addTag('activities', 'Gestión de actividades y subtareas')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
