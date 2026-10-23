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
import { deleteImage, uploadImage, type ImageFolder } from './object-storage';
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
  constructor(private readonly directory: ImageFolder) {}

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
    let truncated = false;
    file.stream.once('limit', () => {
      truncated = true;
    });
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of file.stream) {
      size += chunk.length;
      if (size > MAX_MESSAGE_IMAGE_SIZE) throw new PayloadTooLargeException('Slika mora biti manja od 5 MB.');
      chunks.push(Buffer.from(chunk));
    }
    if (truncated || size > MAX_MESSAGE_IMAGE_SIZE)
      throw new PayloadTooLargeException('Slika mora biti manja od 5 MB.');
    const data = Buffer.concat(chunks);
    const mimeType = validateMessageImage({ buffer: data, size });
    const extension = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    }[mimeType];
    if (!extension) throw new BadRequestException('Nepodržana slika.');
    const filename = `${randomUUID()}${extension}`;
    const path = `${this.directory}/${filename}`;
    await uploadImage(path, data, mimeType);
    return { destination: this.directory, filename, path, size, mimetype: mimeType };
  }

  _removeFile(
    _request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ) {
    void deleteImage(file.path).then(
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
    storage: new ImageStorage(folder),
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
            deleteImage(path).catch(() => undefined),
          ),
        );
        throw error;
      }),
    );
  }
}
