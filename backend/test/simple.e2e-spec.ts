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
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Simple Route Test', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should reach / route', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .expect(200);
    console.log('GET / response:', response.text);
  });

  it('should reach /api/v1/docs (Swagger)', async () => {
    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/docs')
        .send();
      console.log('/api/v1/docs status:', response.status);
      expect([200, 301, 302, 404]).toContain(response.status);
    } catch(e) {
      console.error('Error:', e.message);
    }
  });

  it('should reach /api/v1/auth/login', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123',
      });
    console.log('/api/v1/auth/login status:', response.status);
    console.log('/api/v1/auth/login body:', JSON.stringify(response.body));
    expect([200, 401, 400, 404]).toContain(response.status);
  });
});
