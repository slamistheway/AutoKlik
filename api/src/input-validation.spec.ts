import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_PIPE } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { eq, ilike } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { users, ads } from './db/schema';
import { InputValidationPipe, validateInput } from './input-validation';
import { CreateAdDto, AdsQueryDto } from './dtos/ad.dtos';
import { LoginDto } from './dtos/user.dtos';
import { SendMessageDto } from './dtos/message.dto';

@Controller('validation-test')
class ValidationController {
  @Post('login')
  login(@Body() dto: LoginDto) {
    return dto;
  }

  @Post('message')
  message(@Body() dto: SendMessageDto) {
    return dto;
  }

  @Post('ad')
  @UseInterceptors(FileInterceptor('image'))
  ad(@Body() dto: CreateAdDto) {
    return dto;
  }

  @Get('search')
  search(@Query() dto: AdsQueryDto) {
    return dto;
  }

  @Get('id/:id')
  id(@Param('id') id: string) {
    return { id };
  }
}

describe('input validation', () => {
  const registration = {
    username: 'Test123',
    email: 'Test@example.invalid',
    password: '  Abc!1234  ',
  };

  it('normalizes text and email while preserving passwords exactly', () => {
    expect(
      validateInput(
        { ...registration, username: ' Test123 ', firstName: ' Jose\u0301 ' },
        'RegisterDto',
      ),
    ).toMatchObject({
      username: 'Test123',
      email: 'test@example.invalid',
      password: registration.password,
      firstName: 'José',
    });
  });

  it.each([
    { username: '<script>alert(1)</script>' },
    { email: 'invalid-email' },
    { password: 'short' },
    { password: 'é'.repeat(37) },
    { firstName: { $ne: null } },
    { phone: 'javascript:alert(1)' },
    { username: 'a'.repeat(51) },
    { firstName: 'bad\0name' },
    { role: 'admin' },
  ])('rejects invalid registration fields: %p', (invalid) => {
    expect(() =>
      validateInput({ ...registration, ...invalid }, 'RegisterDto'),
    ).toThrow();
  });

  it('keeps legitimate names, punctuation, multiline text and HTML-looking content as plain text', () => {
    expect(
      validateInput(
        { firstName: "O'Connor", city: 'Šibenik' },
        'UpdateProfileDto',
      ),
    ).toEqual({ firstName: "O'Connor", city: 'Šibenik' });
    const body = '<script>alert(1)</script>\r\nPrice < 100 €';
    expect(
      validateInput({ conversationId: 1, body }, 'SendMessageDto'),
    ).toEqual({ conversationId: 1, body: body.replace('\r\n', '\n') });
  });

  it('rejects malformed objects, prototype properties and oversized messages', () => {
    for (const body of [null, [], 'text'])
      expect(() => validateInput(body, 'LoginDto')).toThrow();
    expect(() =>
      validateInput(
        JSON.parse('{"__proto__":{"admin":true}}') as unknown,
        'UpdateProfileDto',
      ),
    ).toThrow();
    expect(() =>
      validateInput(
        { conversationId: 1, body: 'a'.repeat(10001) },
        'SendMessageDto',
      ),
    ).toThrow();
    expect(() =>
      validateInput({ conversationId: true, body: 'text' }, 'SendMessageDto'),
    ).toThrow();
  });

  it('accepts multipart numeric fields without accepting malformed or fractional IDs', () => {
    expect(
      validateInput(
        {
          title: 'Vehicle',
          category: 'Automobili',
          year: '2020',
          price: '12.50',
          doorNumber: '',
          enginePower: '',
        },
        'CreateAdDto',
      ),
    ).toMatchObject({ year: 2020, price: 12.5, doorNumber: null });
    for (const conversationId of [
      '1 OR 1=1',
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      {},
      [],
    ]) {
      expect(() =>
        validateInput({ conversationId, body: 'hello' }, 'SendMessageDto'),
      ).toThrow();
    }
  });

  it('validates search ranges and accepts SQL-looking search text as data', () => {
    const search = "' OR 1=1 --";
    expect(validateInput({ search }, 'AdsQueryDto')).toEqual({ search });
    expect(() =>
      validateInput({ search: ['one', 'two'] }, 'AdsQueryDto'),
    ).toThrow();
    expect(() =>
      validateInput({ yearMin: '2025', yearMax: '2020' }, 'AdsQueryDto'),
    ).toThrow();
  });

  it('keeps injection strings in Drizzle parameters rather than SQL syntax', () => {
    const attack = "' OR 1=1; DROP TABLE users; --";
    const dialect = new PgDialect();
    for (const condition of [
      eq(users.username, attack),
      ilike(ads.title, `%${attack}%`),
    ]) {
      const query = dialect.sqlToQuery(condition);
      expect(query.sql).not.toContain(attack);
      expect(query.sql).toContain('$1');
      expect(query.params).toHaveLength(1);
      expect(String(query.params[0])).toContain(attack);
    }
  });
});

describe('HTTP validation wiring', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValidationController],
      providers: [{ provide: APP_PIPE, useClass: InputValidationPipe }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates real JSON requests before handlers execute', async () => {
    await request(app.getHttpServer())
      .post('/validation-test/login')
      .send({ identifier: {}, password: 'password' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation-test/login')
      .send({ identifier: ' Test ', password: '  password  ' })
      .expect(201, { identifier: 'Test', password: '  password  ' });
    await request(app.getHttpServer())
      .post('/validation-test/message')
      .send({ conversationId: 'bad', body: 'hello' })
      .expect(400);
  });

  it('validates multipart forms, route IDs and query objects', async () => {
    await request(app.getHttpServer())
      .post('/validation-test/ad')
      .field('title', 'Vehicle')
      .field('category', 'Automobili')
      .field('year', '2020')
      .field('price', '12.50')
      .expect(201, {
        title: 'Vehicle',
        category: 'Automobili',
        year: 2020,
        price: 12.5,
      });
    await request(app.getHttpServer())
      .get('/validation-test/id/1%20OR%201=1')
      .expect(400);
    await request(app.getHttpServer())
      .get('/validation-test/search?yearMin=2025&yearMax=2020')
      .expect(400);
  });
});
