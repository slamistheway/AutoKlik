import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminGuard } from './admin.guard';
import { UserAdminService } from './user-admin.service';
import { SafetyService } from './safety.service';

@Controller('admin')
@UseGuards(SessionAuthGuard, AdminGuard)
export class UserAdminController {
  constructor(private readonly users: UserAdminService, private readonly safety: SafetyService) {}

  @Get('users')
  list(@Query() query: Record<string, string>) { return this.users.list(query); }

  @Post('safety/erasure-files/retry')
  cleanup(@Req() request: { user: { id: number } }) { return this.users.cleanupFiles(request.user.id); }

  @Get('users/:id')
  detail(@Param('id') id: string) { return this.users.detail(+id); }

  @Patch('users/:id')
  change(@Req() request: { user: { id: number } }, @Param('id') id: string, @Body() body: unknown) { return this.users.change(request.user.id, +id, body); }

  @Post('users/:id/erase')
  erase(@Req() request: { user: { id: number } }, @Param('id') id: string, @Body() body: unknown) { return this.users.erase(request.user.id, +id, body); }

  @Get('safety/blocklist')
  blocks() { return this.safety.blocklist(); }

  @Post('safety/blocklist')
  block(@Req() request: { user: { id: number }; ip?: string }, @Body() body: unknown) { return this.safety.block(request.user.id, body, request.ip ?? null); }

  @Get('safety/appeals')
  appeals() { return this.safety.appeals(); }

  @Patch('safety/appeals/:id')
  resolveAppeal(@Req() request: { user: { id: number } }, @Param('id') id: string, @Body() body: unknown) { return this.safety.resolveAppeal(request.user.id, +id, body); }

  @Get('safety/repeat-offenders')
  repeatOffenders() { return this.safety.repeatOffenders(); }

  @Post('reports/:id/message-review')
  review(@Req() request: { user: { id: number } }, @Param('id') id: string, @Body() body: unknown) { return this.safety.reviewMessage(request.user.id, +id, body); }
}

@Controller('dealer/profile')
@UseGuards(SessionAuthGuard)
export class DealerController {
  constructor(private readonly users: UserAdminService) {}

  @Get()
  profile(@Req() request: { user: { id: number } }) { return this.users.myDealer(request.user.id); }

  @Post()
  apply(@Req() request: { user: { id: number } }, @Body() body: unknown) { return this.users.applyDealer(request.user.id, body); }
}

@Controller('appeals')
export class AppealsController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 60000 }, burst: { limit: 3, ttl: 10000 } })
  submit(@Body() body: unknown) { return this.safety.submitAppeal(body); }
}
