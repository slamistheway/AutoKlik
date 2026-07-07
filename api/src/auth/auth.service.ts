import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
    Logger // <-- Correct import
} from '@nestjs/common';
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    private readonly usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
    private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    constructor(
        @InjectRepository(User) private readonly usersRepo: Repository<User>,
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
            const createdUsersRepo = this.usersRepo.create({
                username,
                email,
                password: hashedPassword,
                pfp,
                firstName,
                lastName,
                phone,
                city,
                country,
            });

            const user = await this.usersRepo.save(createdUsersRepo);
            this.logger.log(`User created: id=${user.id}, username=${user.username}`);

            return {
                message: 'Registracija uspješna.',
            };
        } catch (err) {
            if (err instanceof QueryFailedError) {
                const driverError: any = (err as any).driverError;
                if (driverError?.code === '23505') {
                    const detail = String(driverError?.detail ?? '');
                    if (detail.includes('username')) {
                        this.logger.warn('Username already exists');
                        throw new ConflictException('Krosničko ime već postoji');
                    }
                    if (detail.includes('email')) {
                        this.logger.warn('Email already exists');
                        throw new ConflictException('Email već postoji');
                    }

                    throw new ConflictException('Korisnik već postoji.');
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

        try {
            const normalizedIdentifier = isEmail ? identifier.toLowerCase() : identifier;
            const user = await this.usersRepo.findOne({
                where: isEmail ? { email: normalizedIdentifier } : { username: normalizedIdentifier },
            });

            if (!user) {
                this.logger.warn(`Login failed: users row not found for email/username="${identifier}"`);
                throw new UnauthorizedException('Neispravni podaci za prijavu.');
            }

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
