import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { DrizzleModule } from '../db/drizzle/drizzle.module';

const jwtSecret = process.env.JWT_SECRET ?? 'dev_jwt_secret';
if (!process.env.JWT_SECRET) {
  // warn so it's obvious in logs during development

  console.warn(
    'Warning: JWT_SECRET is not set. Using development fallback secret. Do not use in production.',
  );
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
    DrizzleModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
