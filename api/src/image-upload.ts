import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';
import type { StorageEngine } from 'multer';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import {
  constants,
  copyFile,
  mkdir,
  mkdtemp,
  open,
  rm,
  unlink,
} from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';
import { catchError } from 'rxjs';
import {
  MAX_MESSAGE_IMAGE_SIZE,
  validateMessageImage,
} from './users/message-image';

// Only paths created by this storage engine can be removed by the interceptor.
const uploadedPaths = new WeakMap<Request, Set<string>>();

export function retainImageUploads(request: Request) {
  uploadedPaths.delete(request);
}

export class ImageStorage implements StorageEngine {
  constructor(private readonly directory: string) {}

  _handleFile(
    _request: Request,
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
  ) {
    void this.store(file).then((info) => {
      const paths = uploadedPaths.get(_request) ?? new Set<string>();
      paths.add(info.path);
      uploadedPaths.set(_request, paths);
      callback(null, info);
    }, callback);
  }

  private async store(file: Express.Multer.File) {
    const temporary = await mkdtemp(join(tmpdir(), 'autoklik-upload-'));
    const staged = join(temporary, 'image');
    try {
      let truncated = false;
      file.stream.once('limit', () => {
        truncated = true;
      });
      await pipeline(
        file.stream,
        createWriteStream(staged, { flags: 'wx', mode: 0o600 }),
      );
      const handle = await open(staged, 'r');
      let mimeType: string;
      let size: number;
      try {
        size = (await handle.stat()).size;
        if (truncated || size > MAX_MESSAGE_IMAGE_SIZE)
          throw new PayloadTooLargeException('Slika mora biti manja od 5 MB.');
        const header = Buffer.alloc(12);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        mimeType = validateMessageImage({
          buffer: header.subarray(0, bytesRead),
          size,
        });
      } finally {
        await handle.close();
      }
      const extension = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      }[mimeType];
      if (!extension) throw new BadRequestException('Nepodržana slika.');
      const filename = `${randomUUID()}${extension}`;
      await mkdir(this.directory, { recursive: true });
      const path = join(this.directory, filename);
      await copyFile(staged, path, constants.COPYFILE_EXCL);
      return {
        destination: this.directory,
        filename,
        path,
        size,
        mimetype: mimeType,
      };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }

  _removeFile(
    _request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ) {
    void unlink(file.path).then(
      () => callback(null),
      (error: NodeJS.ErrnoException) =>
        callback(error.code === 'ENOENT' ? null : error),
    );
  }
}

export function imageUploadOptions(
  folder: 'ad-images' | 'pfp',
  files: number,
): MulterOptions {
  return {
    storage: new ImageStorage(join(process.cwd(), 'public', folder)),
    limits: {
      fileSize: MAX_MESSAGE_IMAGE_SIZE,
      files,
      fields: 50,
      fieldSize: 40000,
      parts: files + 50,
    },
  };
}

@Injectable()
export class ImageUploadCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError(async (error) => {
        await Promise.all(
          [...(uploadedPaths.get(request) ?? [])].map((path) =>
            unlink(path).catch(() => undefined),
          ),
        );
        throw error;
      }),
    );
  }
}
