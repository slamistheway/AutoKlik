import { Controller, Get, Header, Req, StreamableFile } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { downloadImage } from './object-storage';
import { validateMessageImage } from './users/message-image';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['ad-images/:filename', 'pfp/:filename'])
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'public, max-age=86400')
  async image(@Req() request: Request) {
    const filename = request.params.filename;
    const folder = request.path.startsWith('/ad-images/') ? 'ad-images' : 'pfp';
    const data = await downloadImage(`${folder}/${filename}`);
    const mimeType = validateMessageImage({ buffer: data, size: data.length });
    return new StreamableFile(data, { type: mimeType, disposition: 'inline', length: data.length });
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
