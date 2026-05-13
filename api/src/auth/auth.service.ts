import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
    Logger // <-- Correct import
} from '@nestjs/common';
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";
import { Pool } from 'pg';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    private readonly usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
    private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    constructor(
        @Inject('DATABASE_POOL') private readonly pool: Pool,
        private readonly jwtService: JwtService,
    ) {}



    async register(dto: RegisterDto) {
        const username = dto.username?.trim();
        const email = dto.email?.trim().toLowerCase();
        const password = dto.password;
        const firstName = dto.firstName?.trim() || null;
        const lastName = dto.lastName?.trim() || null;
        const phone = dto.phone?.trim() || null;
        const city = dto.city?.trim() || null;
        const country = dto.country?.trim() || null;

        this.logger.debug(`Received register request: username="${username}", email="${email}"`);

        if (!username || !email || !password || (!this.usernameRegex.test(username)) || (!this.emailRegex.test(email)) || (!this.passwordRegex.test(password))) {
            this.logger.warn('Podaci za registraciju nisu ispravni');
            throw new BadRequestException("Podaci za registraciju nisu ispravni");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const pfp = 'default-pfp.jpg';
        this.logger.debug(`Hashed password for username="${username}": ${hashedPassword}`);

        try {
            const result = await this.pool.query(
                `INSERT INTO users (username, email, password, pfp, first_name, last_name, phone, city, country)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id, username, email, pfp, first_name, last_name, phone, city, country`,
                [username, email, hashedPassword, pfp, firstName, lastName, phone, city, country],
            );

            const user = result.rows[0];
            this.logger.log(`User created: ${JSON.stringify(user)}`);

            return {
                message: 'Registracija uspješna.',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    pfp: user.pfp,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    city: user.city,
                    country: user.country,
                },
            };
        } catch (err) {
            if (err.code === '23505') {
                const detail = err.detail;
                if (detail.includes('username')) {
                    this.logger.warn('Username already exists');
                    throw new ConflictException("Krosničko ime već postoji");
                } else if (detail.includes('email')) {
                    this.logger.warn('Email already exists');
                    throw new ConflictException("Email već postoji");
                }
            }

            this.logger.error('Unexpected registration error', err?.stack ?? err);
            throw new InternalServerErrorException('Došlo je do greške pri registraciji.');
        }
    }


    async login(dto: LoginDto) {
        this.logger.debug('Login method called');

        const identifier = dto.identifier?.trim();
        const password = dto.password;

        this.logger.debug(`Login attempt for identifier "${identifier}"`);

        if (!identifier || !password) {
            this.logger.warn('Nedostaje email/username ili lozinka');
            throw new BadRequestException('Nedostaje email/username ili lozinka');
        }

        const isEmail = identifier.includes('@');
        const query = isEmail
            ? 'SELECT id, username, email, password, pfp FROM users WHERE email = $1'
            : 'SELECT id, username, email, password, pfp FROM users WHERE username = $1';


        try {
            const result = await this.pool.query(query, [identifier]);

            if (result.rows.length === 0) {
                this.logger.warn(`Login failed: users row not found for email/username="${identifier}"`);
                throw new UnauthorizedException('Neispravni podaci za prijavu.');
            }

            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                this.logger.warn(`Login failed: invalid password for user id=${user.id}`);
                throw new UnauthorizedException('Neispravni podaci za prijavu.');
            }

            let token: string;
            try {
                token = this.jwtService.sign({ id: user.id, email: user.email });
            } catch (err) {
                this.logger.error('JWT sign error', err?.stack ?? err);
                throw new InternalServerErrorException('Greška pri generiranju tokena.');
            }

            this.logger.log(`User logged in: id=${user.id}, username=${user.username}`);

            return {
                message: 'Prijava uspješna.',
                token,
                user: { id: user.id, username: user.username, email: user.email, pfp: user.pfp },
            };
        } catch (err) {
            if (err instanceof BadRequestException || err instanceof UnauthorizedException || err instanceof InternalServerErrorException) {
                throw err;
            }

            this.logger.error(`Došlo je do greške u prijavi: ${err}`);
            throw new InternalServerErrorException('Došlo je do greške pri prijavi.');
        }
    }

}
