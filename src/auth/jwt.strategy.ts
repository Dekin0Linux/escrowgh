// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'), // ✅ use ConfigService
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // This gets attached to req.user
    return {
      userId: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
      isBlocked: payload.isBlocked,
    };
  }
}
