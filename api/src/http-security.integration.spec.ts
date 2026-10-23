import { Body, Controller, Get, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'http';
import request from 'supertest';
import { allowedOrigins, configureHttpSecurity } from './http-security';

@Controller('security-test')
class SecurityController {
  @Get()
  get() {
    return { ok: true };
  }

  @Post()
  post(@Body() body: unknown) {
    return body;
  }
}

describe('HTTP security wiring', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SecurityController],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureHttpSecurity(app as NestExpressApplication);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('allows configured clients and sets security headers on actual responses', async () => {
    await request(app.getHttpServer() as Server)
      .post('/security-test')
      .set('Origin', allowedOrigins()[0])
      .send({ value: 'valid' })
      .expect('Access-Control-Allow-Origin', allowedOrigins()[0])
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(201, { value: 'valid' });
    const response = await request(app.getHttpServer() as Server)
      .get('/security-test')
      .expect(200);
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });

  it('rejects cross-site submissions and cookie mutations without an origin', async () => {
    await request(app.getHttpServer() as Server)
      .post('/security-test')
      .set('Origin', 'https://evil.example')
      .send({ value: 'bad' })
      .expect(403);
    await request(app.getHttpServer() as Server)
      .post('/security-test')
      .set('Cookie', 'session=secret')
      .send({ value: 'bad' })
      .expect(403);
  });

  it('enforces JSON and URL-encoded body limits', async () => {
    await request(app.getHttpServer() as Server)
      .post('/security-test')
      .send({ value: 'x'.repeat(65536) })
      .expect(413);
    await request(app.getHttpServer() as Server)
      .post('/security-test')
      .type('form')
      .send({ value: 'x'.repeat(65536) })
      .expect(413);
  });
});
