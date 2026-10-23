import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get, Header, Logger, Param, ParseIntPipe,
    Patch,
    Post,
    Request, Res, HttpException, StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { BetterAuthService } from '../auth/better-auth.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions, ImageUploadCleanupInterceptor } from '../image-upload';
import * as messageImage from "./message-image";
import type { Response, Request as ExpressRequest } from 'express';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { ConversationDto, SendMessageDto, MessageImageDto, ReadMessagesDto } from '../dtos/message.dto';
import {LoginDto, RegisterDto, UpdateProfileDto} from "../dtos/user.dtos";
import { ForgotPasswordDto, ResetPasswordDto } from '../dtos/user.dtos';
import { Throttle } from '@nestjs/throttler';
import { MessageEventsService } from './message-events.service';


@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly registrationAttempts: RegistrationAttemptsService,
        private readonly auth: BetterAuthService,
        private readonly messageEvents: MessageEventsService,
    ) {
    }

    @UseGuards(SessionAuthGuard)
    @Get('me')
    getMe(@Request() req: any) {
        return this.usersService.getMe(Number(req.user.id));
    }



    @UseGuards(SessionAuthGuard)
    @Post('logout')
    logout(@Request() req: ExpressRequest & { user: { id: number; sessionId: string } }) {
        return this.auth.logout(req);
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 60000, generateKey: (_context, tracker) => `password-reset-request:${tracker}` } })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.auth.forgotPassword(dto.email);
    }

    @Post('reset-password')
    @Throttle({ default: { limit: 10, ttl: 60000, blockDuration: 60000, generateKey: (_context, tracker) => `password-reset-confirm:${tracker}` } })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.auth.resetPassword(dto.token, dto.newPassword);
    }

    @Post('register')
    async register(@Body() dto: RegisterDto, @Request() req: ExpressRequest, @Res({ passthrough: true }) response: Response) {
        try {
            return await this.registrationAttempts.execute(req.ip ?? req.socket.remoteAddress ?? 'unknown', () => this.usersService.register(dto, req.ip ?? req.socket.remoteAddress ?? 'unknown'));
        } catch (err) {
            if (err instanceof HttpException && err.getStatus() === 429) {
                const body = err.getResponse() as { retryAfter?: number };
                if (body.retryAfter) response.setHeader('Retry-After', body.retryAfter);
            }
            this.logger.error('RegisterPage error', err?.stack ?? err);
            throw err;
        }
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Request() request: ExpressRequest, @Res({ passthrough: true }) response: Response) {
        try {
            return await this.usersService.login(dto, request.ip ?? request.socket.remoteAddress ?? null);
        } catch (err) {
            if (err instanceof HttpException && err.getStatus() === 429) {
                const body = err.getResponse() as { retryAfter?: number };
                if (body.retryAfter) response.setHeader('Retry-After', body.retryAfter);
            }
            this.logger.error('Login error', err?.stack ?? err);
            throw err;
        }
    }


    @UseGuards(SessionAuthGuard)
    @Post('me/upload-pfp')
    @UseInterceptors(ImageUploadCleanupInterceptor, FileInterceptor('file', imageUploadOptions('pfp', 1)))

    updatePfp(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Datoteka nije poslana.');
        }

        return this.usersService.updatePfp(Number(req.user.id), `pfp/${file.filename}`);
    }

    @UseGuards(SessionAuthGuard)
    @Patch('me')
    updateMe(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
        return this.usersService.updateProfile(Number(req.user.id), updateProfileDto);
    }

    @UseGuards(SessionAuthGuard)
    @Delete('me')
    deleteMe(@Request() req: any) {
        return this.usersService.deleteMe(Number(req.user.id));
    }


    /*------------------------------------MESSAGGES-------------------------------------------------*/
    @UseGuards(SessionAuthGuard)
    @Get('message-events')
    messageStream(@Request() req: ExpressRequest & { user: { id: number } }, @Res() response: Response) {
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'private, no-cache, no-transform');
        response.setHeader('X-Accel-Buffering', 'no');
        response.flushHeaders();
        const write = () => {
            if (!response.writableEnded && !response.write('data: update\n\n')) response.end();
        };
        const subscription = this.messageEvents.forUser(Number(req.user.id)).subscribe(write);
        write();
        let checking = false;
        const heartbeat = setInterval(async () => {
            if (checking) return;
            checking = true;
            try {
                if (!await this.auth.authenticate(req)) response.end();
                else if (!response.writableEnded) response.write(': heartbeat\n\n');
            } catch { response.end(); }
            finally { checking = false; }
        }, 30000);
        response.on('close', () => { clearInterval(heartbeat); subscription.unsubscribe(); });
    }

    @UseGuards(SessionAuthGuard)
    @Post('blockUser')
    blockUser(@Request() req: any, @Body() body: ConversationDto) {
        return this.usersService.setUserBlocked(Number(req.user.id), body.otherUserId, true);
    }

    @UseGuards(SessionAuthGuard)
    @Post('unblockUser')
    unblockUser(@Request() req: any, @Body() body: ConversationDto) {
        return this.usersService.setUserBlocked(Number(req.user.id), body.otherUserId, false);
    }

    @UseGuards(SessionAuthGuard)
    @Get('getConversations')
    async getConversations(@Request() req: any) {
        try {
            return await this.usersService.getConversations(Number(req.user.id));
        } catch (err) {
            this.logger.error('Get conversations error', err?.stack ?? err);
            throw err;
        }
    }

    @UseGuards(SessionAuthGuard)
    @Post('addConversation')
    async addConversation(@Request() req: any, @Body() body: ConversationDto) {
        const userId = Number(req.user.id);
        const otherUserId = Number(body.otherUserId);
        return await this.usersService.addConversation(userId, otherUserId);
    }

    @UseGuards(SessionAuthGuard)
    @Post('loadConversation')
    async loadConversation(@Request() req: any, @Body() body: ConversationDto) {
        const userId = Number(req.user.id);
        const otherUserId = Number(body.otherUserId);
        return await this.usersService.loadConversation(userId, otherUserId);
    }

    @UseGuards(SessionAuthGuard)
    @Post('sendMessage')
    async sendMessage(@Request() req: any, @Body() body: SendMessageDto) {
        return await this.usersService.sendMessage(Number(req.user.id), body.conversationId, body.body);
    }

    @UseGuards(SessionAuthGuard)
    @Post('markMessagesRead')
    async markMessagesRead(@Request() req: any, @Body() body: ReadMessagesDto) {
        return await this.usersService.markMessagesRead(Number(req.user.id), body.conversationId, body.throughMessageId);
    }

    @UseGuards(SessionAuthGuard)
    @Post('sendMessageImage')
    @UseInterceptors(FileInterceptor('image', {
        limits: {
            fileSize: messageImage.MAX_MESSAGE_IMAGE_SIZE,
            files: 1,
            fields: 2,
            fieldSize: 40000
        }
    }))
    async sendMessageImage(@Request() req: any, @Body() body: MessageImageDto, @UploadedFile() image?: messageImage.MessageImageUpload) {
        return await this.usersService.sendMessage(Number(req.user.id), Number(body.conversationId), body.body ?? '', image);
    }

    @UseGuards(SessionAuthGuard)
    @Get('messages/:messageId/image')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async getMessageImage(@Request() req: any, @Param('messageId') messageId: string) {
        const image = await this.usersService.getMessageImage(Number(req.user.id), Number(messageId));
        return new StreamableFile(image.data, {type: image.mimeType, disposition: 'inline', length: image.data.length});
    }

    @Get(':userId')
    getUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUser(userId);
    }
}
