import {
  BadRequestException, ConflictException,
  Inject, HttpException,
  Injectable, InternalServerErrorException,
  Logger,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import {and, eq, inArray, lte, ne, or, isNull, sql, desc} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import * as bcrypt from 'bcrypt';
import {JwtService} from "@nestjs/jwt";
import {MessageImageUpload, validateMessageImage} from './message-image';
import {decryptMessageContent, encryptMessageContent, messageBodyContext} from "./message-crypto";
import { LoginAttemptsService } from './login-attempts.service';
import { AuditService } from '../audit/audit.service';
import { createHash } from 'crypto';
import { validateInput } from '../input-validation';
import {LoginDto, RegisterDto, UpdateProfileDto} from "../dtos/user.dtos";


const { users, ads, adImages, savedAds, conversations, messages, messageImages } = schema;
type User = typeof users.$inferSelect;


const passwordHasher = bcrypt as unknown as {
  hash: (password: string, saltRounds: number) => Promise<string>;
  compare: (password: string, hashedPassword: string) => Promise<boolean>;
};


@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  private readonly usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ip: string | null) {
    dto = validateInput(dto, 'RegisterDto') as unknown as RegisterDto;
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


    const hashedPassword = await passwordHasher.hash(password, 10);
    const pfp = 'default-pfp.jpg';

    try {
      const [user] = await this.db
          .insert(users)
          .values({username, email, password: hashedPassword, pfp, firstName, lastName, phone, city, country,})
          .returning({ id: users.id, username: users.username });


      await this.auditService.recordRegister(user.id, ip);
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

  async login(dto: LoginDto, ip: string | null) {
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

      const attemptKey = user ? `user:${user.id}` : `identifier:${createHash('sha256').update(normalizedIdentifier).digest('hex')}`;
      this.loginAttempts.assertAvailable(attemptKey);

      if (!user) {
        this.loginAttempts.recordFailure(attemptKey);
        this.logger.warn(
            `Login failed: users row not found for email/username="${identifier}"`,
        );
        throw new UnauthorizedException('Neispravni podaci za prijavu.');
      }

      const isMatch = await passwordHasher.compare(password, user.password);
      this.loginAttempts.assertAvailable(attemptKey);
      if (!isMatch) {
        this.loginAttempts.recordFailure(attemptKey);
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

      await this.auditService.recordLogin(user.id, ip);
      this.loginAttempts.reset(attemptKey);
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
          error instanceof HttpException ||
          error instanceof UnauthorizedException ||
          error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(`Došlo je do greške u prijavi: ${String(error)}`);
      throw new InternalServerErrorException('Došlo je do greške pri prijavi.');
    }
  }



  private mapUserEntity(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      pfp: user.pfp,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      city: user.city,
      country: user.country,
    };
  }

  async getMe(userId: number) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen.');
    }

    return this.mapUserEntity(user);
  }

  async getUser(userId: number) {
    const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen.');
    }

    return this.mapUserEntity(user);
  }

  async updatePfp(userId: number, pfpPath: string) {
    if (!pfpPath?.trim()) {
      throw new BadRequestException('Profilna slika nije proslijedena.');
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({ pfp: pfpPath.trim() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, pfp: users.pfp });

    if (!updatedUser) {
      throw new NotFoundException('Korisnik nije pronaden.');
    }

    this.logger.debug(`Updated profile picture for user ${userId}`);

    return updatedUser;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Neispravan korisnik.');
    }

    const firstName = updateProfileDto.firstName?.trim() ?? '';
    const lastName = updateProfileDto.lastName?.trim() ?? '';
    const phone = updateProfileDto.phone?.trim() ?? '';
    const city = updateProfileDto.city?.trim() ?? '';
    const country = updateProfileDto.country?.trim() ?? '';

    const [updatedUser] = await this.db
      .update(users)
      .set({
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        city: city || null,
        country: country || null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundException('Korisnik nije pronađen.');
    }

    this.logger.debug(`Updated profile fields for user ${userId}`);
    return this.mapUserEntity(updatedUser);
  }

  async deleteMe(userId: number) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Neispravan korisnik.');
    }

    await this.db.transaction(async (tx) => {
      // Remove saved entries created by this user.
      await tx.delete(savedAds).where(eq(savedAds.userId, userId));

      // Remove saved references to ads owned by this user and their images.
      const ownedAds = await tx
        .select({ id: ads.id })
        .from(ads)
        .where(eq(ads.userId, userId));
      const ownedAdIds = ownedAds.map((ad) => ad.id);
      if (ownedAdIds.length > 0) {
        await tx.delete(savedAds).where(inArray(savedAds.adId, ownedAdIds));
        await tx.delete(adImages).where(inArray(adImages.adId, ownedAdIds));
      }

      await tx.delete(ads).where(eq(ads.userId, userId));

      const [deletedUser] = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!deletedUser) {
        throw new NotFoundException('Korisnik nije pronađen.');
      }
    });

    this.logger.debug(`Deleted user account ${userId}`);

    return {
      message: 'Račun je uspješno izbrisan.',
    };
  }


  /*-------------------------MESSAGES-----------------------*/
  async addConversation(userId: number, otherUserId: number) {
    const a = Math.min(userId, otherUserId);
    const b = Math.max(userId, otherUserId);

    try {
      const [existing] = await this.db
          .select()
          .from(conversations)
          .where(and(eq(conversations.userAid, a), eq(conversations.userBid, b)))
          .limit(1);

      if (existing) {
        return existing;
      }

      const [inserted] = await this.db
          .insert(conversations)
          .values({ userAid: a, userBid: b })
          .returning({ id: conversations.id, userAid: conversations.userAid, userBid: conversations.userBid });

      return inserted;
    } catch (error) {
      this.logger.error(`Failed to add conversation between ${userId} and ${otherUserId}: ${String(error)}`);
      throw new InternalServerErrorException('Došlo je do greške pri kreiranju razgovora.');
    }
  }


  async sendMessage(userId: number, conversationId: number, body: string, image?: MessageImageUpload) {
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || typeof body !== 'string' || (!body.trim() && !image) || body.length > 10000) {
      throw new BadRequestException('Podaci za slanje poruke nisu ispravni.');
    }
    const mimeType = image ? validateMessageImage(image) : null;

    const [conversation] = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(
            eq(conversations.id, conversationId),
            or(eq(conversations.userAid, userId), eq(conversations.userBid, userId)),
        ))
        .limit(1);

    if (!conversation) {
      throw new NotFoundException('Razgovor nije pronađen.');
    }

    const encryptedBody = encryptMessageContent(Buffer.from(body.trim(), 'utf8'), messageBodyContext(conversationId, userId));
    return await this.db.transaction(async tx => {
      const [message] = await tx.insert(messages)
          .values({ conversationId: conversation.id, senderId: userId, body: encryptedBody, encryptionVersion: 1 })
          .returning({ id: messages.id, senderId: messages.senderId, createdAt: messages.createdAt, readAt: messages.readAt });
      if (image && mimeType) {
        await tx.insert(messageImages).values({
          messageId: message.id,
          encryptedData: encryptMessageContent(image.buffer, `message-image:${message.id}:${mimeType}`),
          mimeType,
          size: image.buffer.length,
        });
      }
      return {...message, body: body.trim(), hasImage: Boolean(image)};
    });
  }
  F
  async getMessageImage(userId: number, messageId: number) {
    if (!Number.isSafeInteger(messageId) || messageId <= 0) throw new BadRequestException('Neispravna poruka.');
    const [image] = await this.db.select({encryptedData: messageImages.encryptedData, mimeType: messageImages.mimeType})
        .from(messageImages)
        .innerJoin(messages, eq(messages.id, messageImages.messageId))
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(and(eq(messages.id, messageId), or(eq(conversations.userAid, userId), eq(conversations.userBid, userId))))
        .limit(1);
    if (!image) throw new NotFoundException('Slika nije pronađena.');
    return {data: decryptMessageContent(image.encryptedData, `message-image:${messageId}:${image.mimeType}`), mimeType: image.mimeType};
  }

  async markMessagesRead(userId: number, conversationId: number, throughMessageId: number) {
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0 || !Number.isSafeInteger(throughMessageId) || throughMessageId <= 0) {
      throw new BadRequestException('Podaci za čitanje poruka nisu ispravni.');
    }

    const [conversation] = await this.db.select({id: conversations.id})
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), or(eq(conversations.userAid, userId), eq(conversations.userBid, userId))))
        .limit(1);
    if (!conversation) throw new NotFoundException('Razgovor nije pronađen.');

    const updated = await this.db.update(messages)
        .set({readAt: new Date()})
        .where(and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId),
            isNull(messages.readAt),
            lte(messages.id, throughMessageId),
        ))
        .returning({id: messages.id, readAt: messages.readAt});
    return {messages: updated};
  }

  async loadConversation(userId: number, otherUserId: number) {
    const a = Math.min(userId, otherUserId);
    const b = Math.max(userId, otherUserId);

    try {
      const [conv] = await this.db.select()
          .from(conversations)
          .where(and(eq(conversations.userAid, a), eq(conversations.userBid, b)))
          .limit(1);

      if (!conv) {
        this.logger.warn(`No conversation found between ${userId} and ${otherUserId}`);
        return { conversation: null, messages: [] };
      }

      const msgs = await this.db
          .select({
            id: messages.id, conversationId: messages.conversationId, senderId: messages.senderId,
            body: messages.body, encryptionVersion: messages.encryptionVersion,
            createdAt: messages.createdAt, readAt: messages.readAt, imageId: messageImages.messageId,
          })
          .from(messages)
          .leftJoin(messageImages, eq(messageImages.messageId, messages.id))
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt), desc(messages.id))
          .limit(1000);

      return { conversation: conv, messages: msgs.reverse().map(message => {
          if (message.encryptionVersion !== 0 && message.encryptionVersion !== 1) throw new Error('Unsupported message encryption version.');
          return {
            id: message.id, senderId: message.senderId, createdAt: message.createdAt, readAt: message.readAt,
            hasImage: message.imageId !== null,
            body: message.encryptionVersion === 1 ? decryptMessageContent(message.body, messageBodyContext(message.conversationId, message.senderId)).toString('utf8') : message.body,
          };
        }) };
    } catch (error) {
      this.logger.error(`Failed to load conversation between ${userId} and ${otherUserId}: ${String(error)}`);
      throw new InternalServerErrorException('Došlo je do greške pri učitavanju razgovora.');
    }
  }


  async getConversations(userId: number) {
    try {
      const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw new NotFoundException('Korisnik nije pronađen.');
      }


      return await this.db
          .select({
            id: conversations.id,
            otherUserId: users.id,
            username: users.username,
            pfp: users.pfp,
            createdAt: conversations.createdAt,
            unreadCount: sql<number>`(select count(*)::int from ${messages} where ${messages.conversationId} = ${conversations.id} and ${messages.senderId} <> ${userId} and ${messages.readAt} is null)`.mapWith(Number),
          })
          .from(conversations)
          .innerJoin(users, or(
              and(eq(conversations.userAid, userId), eq(users.id, conversations.userBid)),
              and(eq(conversations.userBid, userId), eq(users.id, conversations.userAid)),
          ))
          .where(or(eq(conversations.userAid, userId), eq(conversations.userBid, userId)))
          .orderBy(conversations.createdAt, conversations.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Došlo je do greške prilikom dohvaćanja razgovora: ${String(error)}`);
      throw new InternalServerErrorException('Došlo je do greške prilikom dohvaćanja razgovora.');
    }
  }


}
