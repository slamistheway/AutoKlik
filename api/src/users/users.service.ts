import {
  BadRequestException, ConflictException, ForbiddenException,
  Inject, HttpException,
  Injectable, InternalServerErrorException,
  Logger,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import {and, eq, inArray, lte, ne, or, isNull, sql, desc} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import * as bcrypt from 'bcrypt';
import { BetterAuthService } from '../auth/better-auth.service';
import {MessageImageUpload, validateMessageImage} from './message-image';
import {decryptMessageContent, encryptMessageContent, messageBodyContext} from "./message-crypto";
import { LoginAttemptsService } from './login-attempts.service';
import { AuditService } from '../audit/audit.service';
import { createHash } from 'crypto';
import { validateInput } from '../input-validation';
import {LoginDto, RegisterDto, UpdateProfileDto} from "../dtos/user.dtos";
import { assertNotBlocked } from '../auth/account-access';
import { scamSignals } from './scam-signals';


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
    private readonly auth: BetterAuthService,
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
    await assertNotBlocked(this.db, { email, phone }, ip);

    this.logger.debug(
        `Received register request: username="${username}", email="${email}"`,
    );


    const hashedPassword = await passwordHasher.hash(password, 10);
    const pfp = 'default-pfp.jpg';

    try {
      const user = await this.db.transaction(async tx => {
        const [created] = await tx.insert(users)
          .values({ username, email, password: hashedPassword, pfp, firstName, lastName, phone, city, country })
          .returning();
        await this.auth.createIdentity(created, tx);
        return created;
      });
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

      let token: string;
      try {
        const session = await this.auth.signIn(user, password, ip);
        token = session.token;
      } catch (error) {
        const authError = error as { statusCode?: number; status?: number | string };
        if (authError.statusCode === 401 || authError.status === 401 || authError.status === 'UNAUTHORIZED') {
          this.loginAttempts.recordFailure(attemptKey);
          throw new UnauthorizedException('Neispravni podaci za prijavu.');
        }
        throw error;
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
      sellerVerified: user.sellerVerified,
      badges: user.badges,
      dealerStatus: user.dealerStatus,
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

    const changes: Partial<typeof users.$inferInsert> = {};
    for (const field of ['firstName', 'lastName', 'phone', 'city', 'country'] as const) {
      if (updateProfileDto[field] !== undefined) changes[field] = updateProfileDto[field]?.trim() || null;
    }
    if (!Object.keys(changes).length) throw new BadRequestException('Nema promjena za spremanje.');
    if (changes.phone) await assertNotBlocked(this.db, { phone: changes.phone }, null);

    const [updatedUser] = await this.db
      .update(users)
      .set(changes)
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
      const [staff] = await tx.select({ role: users.role }).from(users).where(eq(users.id, userId));
      if (staff && ['admin', 'moderator'].includes(staff.role)) throw new BadRequestException('Brisanje računa osoblja mora obaviti drugi administrator.');
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
      await tx.delete(schema.user).where(eq(schema.user.id, String(userId)));

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
  private blockCondition(userId: number, otherUserId: number) {
    const blocks = schema.userBlocks;
    return or(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, otherUserId)), and(eq(blocks.blockerId, otherUserId), eq(blocks.blockedId, userId)));
  }

  async setUserBlocked(userId: number, otherUserId: number, blocked: boolean) {
    if (!Number.isSafeInteger(otherUserId) || otherUserId <= 0 || userId === otherUserId) throw new BadRequestException('Neispravan korisnik.');
    const [recipient] = await this.db.select({id: users.id}).from(users).where(eq(users.id, otherUserId)).limit(1);
    if (!recipient) throw new NotFoundException('Korisnik nije pronađen.');
    await this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`chat:${Math.min(userId, otherUserId)}:${Math.max(userId, otherUserId)}`}, 0))`);
      if (blocked) await tx.insert(schema.userBlocks).values({blockerId: userId, blockedId: otherUserId}).onConflictDoNothing();
      else await tx.delete(schema.userBlocks).where(and(eq(schema.userBlocks.blockerId, userId), eq(schema.userBlocks.blockedId, otherUserId)));
      await tx.execute(sql`select pg_notify('message_updates', ${JSON.stringify([userId, otherUserId])})`);
    });
    return {blocked};
  }

  async addConversation(userId: number, otherUserId: number) {
    const [recipient] = await this.db.select({ id: users.id }).from(users).where(and(eq(users.id, otherUserId), eq(users.accountStatus, 'active'))).limit(1);
    if (!recipient || userId === otherUserId) throw new NotFoundException('Primatelj nije dostupan.');
    const [block] = await this.db.select().from(schema.userBlocks).where(this.blockCondition(userId, otherUserId)).limit(1);
    if (block) throw new ForbiddenException('Slanje poruka ovom korisniku nije dostupno.');
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
        .select({ id: conversations.id, userAid: conversations.userAid, userBid: conversations.userBid })
        .from(conversations)
        .where(and(
            eq(conversations.id, conversationId),
            or(eq(conversations.userAid, userId), eq(conversations.userBid, userId)),
            sql`exists (select 1 from ${users} where ${users.id} = case when ${conversations.userAid} = ${userId} then ${conversations.userBid} else ${conversations.userAid} end and ${users.accountStatus} = 'active')`,
        ))
        .limit(1);

    if (!conversation) {
      throw new NotFoundException('Razgovor nije pronađen.');
    }

    const encryptedBody = encryptMessageContent(Buffer.from(body.trim(), 'utf8'), messageBodyContext(conversationId, userId));
    return await this.db.transaction(async tx => {
      const otherUserId = conversation.userAid === userId ? conversation.userBid : conversation.userAid;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`chat:${Math.min(userId, otherUserId)}:${Math.max(userId, otherUserId)}`}, 0))`);
      const [block] = await tx.select().from(schema.userBlocks).where(this.blockCondition(userId, otherUserId)).limit(1);
      if (block) throw new ForbiddenException('Slanje poruka ovom korisniku nije dostupno.');
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
      const signals = scamSignals(body);
      if (signals.length) await tx.insert(schema.moderationReports).values({ targetType: 'message', targetId: message.id, subjectUserId: userId, source: 'automated', reason: 'Automatski sigurnosni pregled: ' + signals.join(', '), signals });
      await tx.execute(sql`select pg_notify('message_updates', ${JSON.stringify([conversation.userAid, conversation.userBid])})`);
      return {...message, body: body.trim(), hasImage: Boolean(image)};
    });
  }
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

    const [conversation] = await this.db.select({id: conversations.id, userAid: conversations.userAid, userBid: conversations.userBid})
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
    if (updated.length) await this.db.execute(sql`select pg_notify('message_updates', ${JSON.stringify([conversation.userAid, conversation.userBid])})`);
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
            blockedByMe: sql<boolean>`exists (select 1 from ${schema.userBlocks} where ${schema.userBlocks.blockerId} = ${userId} and ${schema.userBlocks.blockedId} = ${users.id})`,
            messagingBlocked: sql<boolean>`exists (select 1 from ${schema.userBlocks} where (${schema.userBlocks.blockerId} = ${userId} and ${schema.userBlocks.blockedId} = ${users.id}) or (${schema.userBlocks.blockerId} = ${users.id} and ${schema.userBlocks.blockedId} = ${userId}))`,
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
