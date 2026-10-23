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
import { deleteImage, uploadImage } from './object-storage';
import request from 'supertest';
import {
  ImageStorage,
  ImageUploadCleanupInterceptor,
  retainImageUploads,
} from './image-upload';
import { InputValidationPipe } from './input-validation';
import { CreateAdDto } from './dtos/ad.dtos';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { downloadImage } from './object-storage';

jest.mock('./object-storage', () => ({ uploadImage: jest.fn(), deleteImage: jest.fn(), downloadImage: jest.fn() }));

describe('public image upload security', () => {
  let app: INestApplication;
  const stored = new Map<string, Buffer>();
  const readdir = async (_directory: string) => [...stored.keys()];
  const directory = 'ad-images';
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7RkAAAAASUVORK5CYII=',
    'base64',
  );

  beforeEach(async () => {
    stored.clear();
    jest.clearAllMocks();
    (uploadImage as jest.Mock).mockImplementation(async (path: string, data: Buffer) => { stored.set(path, data); });
    (deleteImage as jest.Mock).mockImplementation(async (path: string) => { stored.delete(path); });
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
      controllers: [UploadController, AppController],
      providers: [AppService],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new InputValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
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

  it('serves stored images at the existing ad and avatar URLs', async () => {
    (downloadImage as jest.Mock).mockResolvedValue(png);
    for (const folder of ['ad-images', 'pfp']) {
      const result = await request(app.getHttpServer() as Server).get(`/${folder}/fixture.png`).expect(200);
      expect(downloadImage).toHaveBeenLastCalledWith(`${folder}/fixture.png`);
      expect(result.headers['content-type']).toBe('image/png');
      expect(result.headers['x-content-type-options']).toBe('nosniff');
      expect(result.body).toEqual(png);
    }
  });

  it('rejects stored content that is not a supported image', async () => {
    (downloadImage as jest.Mock).mockResolvedValue(Buffer.from('<svg onload="alert(1)"/>'));
    await request(app.getHttpServer() as Server).get('/ad-images/fixture.png').expect(400);
  });

  it('uses a random canonical extension from the bytes, never the supplied name', async () => {
    const result = await upload(app, png, 'payload.html').expect(201);
    const body = result.body as { filename: string; mimeType: string };
    expect(body).toEqual({
      filename: expect.stringMatching(/^[\da-f-]{36}\.png$/) as string,
      mimeType: 'image/png',
    });
    expect(stored.get(`${directory}/${body.filename}`)).toEqual(png);
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
