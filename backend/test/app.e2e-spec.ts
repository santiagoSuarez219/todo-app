// Setup environment BEFORE importing AppModule
const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_EMAIL = 'test@example.com';
  process.env.AUTH_PASSWORD_HASH = '$2b$10$/74fvSxncNTtCHUFGAks.OsSLlwUAWVRuCkfE0sqK9wJUz6ThvIoe';
  process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-length-required-here';
  process.env.JWT_EXPIRES_IN = '30d';
  process.env.MCP_API_KEY = 'test-mcp-api-key-12345';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5433';
  process.env.DB_NAME = 'todo_db';
  process.env.DB_USER = 'todo_user';
  process.env.DB_PASSWORD = 'todo_password';
  process.env.FRONTEND_URL = 'http://localhost:5173';
};

setupTestEnv();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    const API_PREFIX = 'api/v1';

    // Global prefix (same as main.ts)
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [
        { path: 'mcp', method: RequestMethod.POST },
        { path: 'mcp', method: RequestMethod.GET },
        { path: 'mcp', method: RequestMethod.DELETE },
      ],
    });

    // Cookie parser (same as main.ts)
    app.use(cookieParser());

    // CORS (same as main.ts)
    app.enableCors({
      origin: 'http://localhost:5173',
      credentials: true,
    });

    // Validation (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Global filter & interceptor (same as main.ts)
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
