import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import * as schema from '../db/schema';

const { users } = schema;
const passwordHasher = bcrypt as unknown as {
  hash: (password: string, saltRounds: number) => Promise<string>;
  compare: (password: string, hashedPassword: string) => Promise<boolean>;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  private readonly usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
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

    this.logger.debug(
      `Received register request: username="${username}", email="${email}"`,
    );


    {/*DODAJ REGEXE OVDE KAD PROJEKT BUDE GOTOV*/}
    if (
      !username ||
      !email ||
      !password
    ) {
      this.logger.warn('Podaci za registraciju nisu ispravni');
      throw new BadRequestException('Podaci za registraciju nisu ispravni');
    }

    const hashedPassword = await passwordHasher.hash(password, 10);
    const pfp = 'default-pfp.jpg';

    try {
      const [user] = await this.db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          pfp,
          firstName,
          lastName,
          phone,
          city,
          country,
        })
        .returning({ id: users.id, username: users.username });

      this.logger.log(`User created: id=${user.id}, username=${user.username}`);
      return { message: 'Registracija uspješna.' };
    } catch (error) {
      const databaseError = error as {
        code?: string;
        constraint?: string;
        detail?: string;
        stack?: string;
      };
      if (databaseError.code === '23505') {
        const uniqueField =
          `${databaseError.constraint ?? ''} ${databaseError.detail ?? ''}`.toLowerCase();
        if (uniqueField.includes('username')) {
          this.logger.warn('Username already exists');
          throw new ConflictException('Korisničko ime već postoji');
        }
        if (uniqueField.includes('email')) {
          this.logger.warn('Email already exists');
          throw new ConflictException('Email već postoji');
        }
        throw new ConflictException('Korisnik već postoji.');
      }

      this.logger.error(
        'Unexpected registration error',
        databaseError.stack ?? String(error),
      );
      throw new InternalServerErrorException(
        'Došlo je do greške pri registraciji.',
      );
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
    const normalizedIdentifier = isEmail
      ? identifier.toLowerCase()
      : identifier;

    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(
          isEmail
            ? eq(users.email, normalizedIdentifier)
            : eq(users.username, normalizedIdentifier),
        )
        .limit(1);

      if (!user) {
        this.logger.warn(
          `Login failed: users row not found for email/username="${identifier}"`,
        );
        throw new UnauthorizedException('Neispravni podaci za prijavu.');
      }

      const isMatch = await passwordHasher.compare(password, user.password);
      if (!isMatch) {
        this.logger.warn(
          `Login failed: invalid password for user id=${user.id}`,
        );
        throw new UnauthorizedException('Neispravni podaci za prijavu.');
      }

      let token: string;
      try {
        token = this.jwtService.sign({ id: user.id, email: user.email });
      } catch (error) {
        const signingError = error as { stack?: string };
        this.logger.error(
          'JWT sign error',
          signingError.stack ?? String(error),
        );
        throw new InternalServerErrorException(
          'Greška pri generiranju tokena.',
        );
      }

      this.logger.log(
        `User logged in: id=${user.id}, username=${user.username}`,
      );
      return {
        message: 'Prijava uspješna.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          pfp: user.pfp,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(`Došlo je do greške u prijavi: ${String(error)}`);
      throw new InternalServerErrorException('Došlo je do greške pri prijavi.');
    }
  }
}
