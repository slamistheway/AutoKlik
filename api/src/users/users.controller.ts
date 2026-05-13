import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Patch,
    Post,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@Request() req: any) {
        return this.usersService.getMe(Number(req.user.id));
    }

    @UseGuards(JwtAuthGuard)
    @Post('me/upload-pfp')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const uploadDir = './public/pfp';
                    mkdirSync(uploadDir, { recursive: true });
                    cb(null, uploadDir);
                },
                filename: (_req, file, cb) => {
                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(null, `pfp-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            limits: { fileSize: 5 * 1024 * 1024 },
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
}
