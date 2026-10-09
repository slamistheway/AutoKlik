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
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import * as messageImage from "./message-image";
import type { Response, Request as ExpressRequest } from 'express';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { ConversationDto, SendMessageDto, MessageImageDto, ReadMessagesDto } from '../dtos/message.dto';
import {LoginDto, RegisterDto, UpdateProfileDto} from "../dtos/user.dtos";


@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly registrationAttempts: RegistrationAttemptsService,
        private readonly sessions: SessionsService,
    ) {
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@Request() req: any) {
        return this.usersService.getMe(Number(req.user.id));
    }



    @UseGuards(JwtAuthGuard)
    @Post('logout')
    logout(@Request() req: ExpressRequest & { user: { id: number; tokenHash: string; exp: number } }) {
        return this.sessions.logout(req.user.tokenHash, req.user.id, req.user.exp, req.ip ?? req.socket.remoteAddress ?? null);
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


    @UseGuards(JwtAuthGuard)
    @Post('me/upload-pfp')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const uploadDir = './public/pfp';
                    mkdirSync(uploadDir, {recursive: true});
                    cb(null, uploadDir);
                },
                filename: (_req, file, cb) => {
                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(null, `pfp-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            limits: {fileSize: 5 * 1024 * 1024},
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    cb(new BadRequestException('Dozvoljene su samo slikovne datoteke.'), false);
                    return;
                }
                cb(null, true);
            },
        }),
    )

    updatePfp(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Datoteka nije poslana.');
        }

        return this.usersService.updatePfp(Number(req.user.id), `pfp/${file.filename}`);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    updateMe(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
        return this.usersService.updateProfile(Number(req.user.id), updateProfileDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('me')
    deleteMe(@Request() req: any) {
        return this.usersService.deleteMe(Number(req.user.id));
    }


    /*------------------------------------MESSAGGES-------------------------------------------------*/
    @UseGuards(JwtAuthGuard)
    @Get('getConversations')
    async getConversations(@Request() req: any) {
        try {
            return await this.usersService.getConversations(Number(req.user.id));
        } catch (err) {
            this.logger.error('Get conversations error', err?.stack ?? err);
            throw err;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('addConversation')
    async addConversation(@Request() req: any, @Body() body: ConversationDto) {
        const userId = Number(req.user.id);
        const otherUserId = Number(body.otherUserId);
        return await this.usersService.addConversation(userId, otherUserId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('loadConversation')
    async loadConversation(@Request() req: any, @Body() body: ConversationDto) {
        const userId = Number(req.user.id);
        const otherUserId = Number(body.otherUserId);
        return await this.usersService.loadConversation(userId, otherUserId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('sendMessage')
    async sendMessage(@Request() req: any, @Body() body: SendMessageDto) {
        return await this.usersService.sendMessage(Number(req.user.id), body.conversationId, body.body);
    }

    @UseGuards(JwtAuthGuard)
    @Post('markMessagesRead')
    async markMessagesRead(@Request() req: any, @Body() body: ReadMessagesDto) {
        return await this.usersService.markMessagesRead(Number(req.user.id), body.conversationId, body.throughMessageId);
    }

    @UseGuards(JwtAuthGuard)
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

    @UseGuards(JwtAuthGuard)
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
