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

describe('Auth Module (e2e)', () => {
  let app: INestApplication<App>;

  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'TestPass123';
  const TEST_MCP_API_KEY = 'test-mcp-api-key-12345';

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

  describe('POST /api/v1/auth/login', () => {
    it('TC-001: should return 200 with valid credentials and set httpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('email', TEST_EMAIL);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('auth_token=');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('Path=/');
    });

    it('TC-002: should return 401 with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: TEST_PASSWORD,
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('TC-003: should return 401 with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('TC-004: should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: TEST_PASSWORD,
        })
        .expect(400);
    });

    it('TC-005: should return 400 with missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('TC-006: should return 401 without authentication cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('TC-007: should return 200 with valid authentication cookie', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(meResponse.body).toHaveProperty('data');
      expect(meResponse.body.data).toHaveProperty('email', TEST_EMAIL);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('TC-008: should clear authentication cookie and return 200', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('data');
      expect(logoutResponse.body.data).toHaveProperty('message');

      const setCookieHeader = logoutResponse.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
    });

    it('TC-009: should deny access to protected routes after logout', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      let cookies = loginResponse.headers['set-cookie'];

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      cookies = logoutResponse.headers['set-cookie'];

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(401);
    });
  });

  describe('Protected REST endpoints (with guard)', () => {
    it('TC-010: GET /api/v1/projects should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/projects')
        .expect(401);
    });

    it('TC-011: GET /api/v1/projects should return 200 with valid authentication cookie', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const projectsResponse = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Cookie', cookies)
        .expect(200);

      expect(projectsResponse.body).toHaveProperty('statusCode', 200);
      expect(projectsResponse.body).toHaveProperty('data');
    });
  });

  describe('POST /mcp (MCP API Key authentication)', () => {
    it('TC-012: should return 401 without API key header', async () => {
      const response = await request(app.getHttpServer())
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'list_projects',
          params: {},
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('TC-013: should return 401 with invalid API key', async () => {
      const response = await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-key')
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'list_projects',
          params: {},
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('TC-014: should return 200 with valid MCP_API_KEY in Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${TEST_MCP_API_KEY}`)
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'list_projects',
          params: {},
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('TC-015: MCP should NOT accept JWT-cookie authentication', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app.getHttpServer())
        .post('/mcp')
        .set('Cookie', cookies)
        .send({
          jsonrpc: '2.0',
          id: '1',
          method: 'list_projects',
          params: {},
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Rate limiting (throttling) on POST /api/v1/auth/login', () => {
    it('TC-016: should return 429 after exceeding rate limit (5 attempts per minute)', async () => {
      const loginPayload = {
        email: TEST_EMAIL,
        password: 'WrongPassword',
      };

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginPayload)
          .expect(401);
      }

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginPayload);

      expect(response.status).toBe(429);
    });
  });

  describe('Cookie flags validation (development)', () => {
    it('TC-017: cookie should have sameSite=lax in development', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader[0]).toContain('SameSite=Lax');
    });
  });

  describe('Email case-insensitivity', () => {
    it('TC-018: should accept email in uppercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL.toUpperCase(),
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('email');
    });

    it('TC-019: should accept email with spaces (trimmed)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `  ${TEST_EMAIL}  `,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('email');
    });
  });
});
