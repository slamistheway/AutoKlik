import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db";
import { bearer } from 'better-auth/plugins';
import * as schema from '../src/db/schema';
import bcrypt from 'bcrypt';
import { sendPasswordResetEmail } from '../src/auth/password-reset-email';
import { and, eq } from 'drizzle-orm';

if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be configured with at least 32 characters');
}

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000', 'http://localhost:4200', process.env.ADMIN_URL ?? 'http://localhost:3003'],
    plugins: [bearer()],
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        resetPasswordTokenExpiresIn: 30 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: ({ user, token }) => sendPasswordResetEmail(user.email, token),
        onPasswordReset: async ({ user }) => {
            await db.transaction(async tx => {
                const [credential] = await tx.select({ password: schema.account.password }).from(schema.account)
                    .where(and(eq(schema.account.userId, user.id), eq(schema.account.providerId, 'credential'))).limit(1);
                if (!credential?.password) throw new Error('Credential account is missing');
                await tx.update(schema.users).set({ password: credential.password, passwordResetRequired: false }).where(eq(schema.users.id, Number(user.id)));
                await tx.insert(schema.audit).values({ action: 'password_reset', path: '/users/reset-password', userId: Number(user.id), ip: null });
            });
        },
        password: {
            hash: password => bcrypt.hash(password, 10),
            verify: ({ hash, password }) => bcrypt.compare(password, hash),
        },
    },
    session: { expiresIn: 24 * 60 * 60, cookieCache: { enabled: false } },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
});
