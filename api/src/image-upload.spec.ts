import type { Server } from 'http';
import type { Request } from 'express';
import {
  BadRequestException,
  Body,
  Req,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import request from 'supertest';
import {
  ImageStorage,
  ImageUploadCleanupInterceptor,
  retainImageUploads,
} from './image-upload';
import { InputValidationPipe } from './input-validation';
import { CreateAdDto } from './dtos/ad.dtos';

describe('public image upload security', () => {
  let app: INestApplication;
  let directory: string;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7RkAAAAASUVORK5CYII=',
    'base64',
  );

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'autoklik-image-test-'));
    @Controller('upload')
    class UploadController {
      @Post()
      @UseInterceptors(
        ImageUploadCleanupInterceptor,
        FileInterceptor('file', {
          storage: new ImageStorage(directory),
          limits: { fileSize: 1024, files: 1 },
        }),
      )
      upload(
        @Req() req: Request,
        @Body() body: CreateAdDto,
        @UploadedFile() file: Express.Multer.File,
      ) {
        if (body.title === 'Persisted') {
          retainImageUploads(req);
          throw new BadRequestException('Failed after commit');
        }
        if (body.title === 'Reject') throw new BadRequestException('Rejected');
        return { filename: file.filename, mimeType: file.mimetype };
      }
    }
    const module = await Test.createTestingModule({
      controllers: [UploadController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new InputValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    await rm(directory, { recursive: true, force: true });
  });

  const upload = (
    app: INestApplication,
    data: Buffer,
    filename = 'photo.png',
    title = 'Valid image',
  ) =>
    request(app.getHttpServer() as Server)
      .post('/upload')
      .field('title', title)
      .field('category', 'cars')
      .field('year', '2020')
      .attach('file', data, { filename, contentType: 'image/png' });

  it('rejects HTML and SVG even when the filename and MIME claim PNG', async () => {
    for (const data of [
      '<html><script>alert(1)</script></html>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    ]) {
      await upload(app, Buffer.from(data)).expect(400);
    }
    expect(await readdir(directory)).toEqual([]);
  });

  it('uses a random canonical extension from the bytes, never the supplied name', async () => {
    const result = await upload(app, png, 'payload.html').expect(201);
    const body = result.body as { filename: string; mimeType: string };
    expect(body).toEqual({
      filename: expect.stringMatching(/^[\da-f-]{36}\.png$/) as string,
      mimeType: 'image/png',
    });
    expect(await readFile(join(directory, body.filename))).toEqual(png);
  });

  it('removes files when body validation or the handler rejects the request', async () => {
    await request(app.getHttpServer() as Server)
      .post('/upload')
      .field('unknown', 'x')
      .attach('file', png, 'photo.png')
      .expect(400);
    expect(await readdir(directory)).toEqual([]);
    await upload(app, png, 'photo.png', 'Reject').expect(400);
    expect(await readdir(directory)).toEqual([]);
  });

  it('preserves files already committed to an ad if response preparation fails', async () => {
    await upload(app, png, 'photo.png', 'Persisted').expect(400);
    expect(await readdir(directory)).toHaveLength(1);
  });

  it('rejects oversized and extra files without leaving a public file', async () => {
    await upload(app, Buffer.concat([png, Buffer.alloc(2048)])).expect(413);
    expect(await readdir(directory)).toEqual([]);
    await request(app.getHttpServer() as Server)
      .post('/upload')
      .field('title', 'Valid')
      .field('category', 'cars')
      .field('year', '2020')
      .attach('file', png, 'one.png')
      .attach('file', png, 'two.png')
      .expect(400);
    expect(await readdir(directory)).toEqual([]);
  });
});
