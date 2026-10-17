import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { object, positiveId } from './admin-validation';
import { Throttle } from '@nestjs/throttler';

type StaffRequest = { user: { id: number }; staffRole: string };

@Controller('admin')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('me')
  me(@Req() request: StaffRequest) { return { id: request.user.id, role: request.staffRole }; }

  @Get('dashboard')
  dashboard(@Query('period') period?: string) { return this.service.dashboard(period); }

  @Get('ads')
  ads(@Query() query: Record<string, string | undefined>) { return this.service.listAds(query); }

  @Post('ads/moderate')
  moderate(@Req() request: StaffRequest, @Body() body: unknown) { return this.service.moderate(request.user.id, body); }

  @Post('photos/index')
  index(@Body() value: unknown) {
    const body = object(value, ['after']);
    return this.service.indexPhotos(body.after === 0 ? 0 : positiveId(body.after));
  }

  @Get('ads/:id')
  detail(@Param('id') id: string) { return this.service.detail(+id); }

  @Patch('ads/:id')
  edit(@Req() request: StaffRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.edit(request.user.id, +id, body); }

  @Post('ads/:id/photos/:photoId/remove')
  removePhoto(@Req() request: StaffRequest, @Param('id') id: string, @Param('photoId') photoId: string, @Body() body: unknown) { return this.service.removePhoto(request.user.id, +id, +photoId, body); }

  @Get('reports')
  reports(@Query('type') type?: string, @Query('status') status?: string) { return this.service.listReports(type, status); }

  @Patch('reports/:id')
  resolve(@Req() request: StaffRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.resolveReport(request.user.id, +id, body); }

  @Get('activity')
  activity() { return this.service.activity(); }
}

@Controller('reports')
@UseGuards(SessionAuthGuard)
export class ReportsController {
  constructor(private readonly service: AdminService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 60000 } })
  submit(@Req() request: { user: { id: number } }, @Body() body: unknown) { return this.service.submitReport(request.user.id, body); }
}
