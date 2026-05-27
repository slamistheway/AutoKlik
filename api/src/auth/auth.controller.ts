import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";

@Controller()
export class AuthController {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly authService: AuthService
    ) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        this.logger.debug(`Register payload: ${JSON.stringify(dto)}`);
        try {
            return await this.authService.register(dto);
        } catch (err) {
            this.logger.error('RegisterPage error', err?.stack ?? err);
            throw err;
        }
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        this.logger.debug(`Login payload: ${JSON.stringify({ identifier: dto.identifier ? '***' : '', password: dto.password ? '***' : '' })}`);
        try {
            return await this.authService.login(dto);
        } catch (err) {
            this.logger.error('Login error', err?.stack ?? err);
            throw err;
        }
    }
}
