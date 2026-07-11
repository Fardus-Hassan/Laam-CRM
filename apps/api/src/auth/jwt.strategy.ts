import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthUserPayload } from '../common/decorators';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? 'laam-dev-jwt-secret-change-me',
    });
  }

  validate(payload: JwtPayload): AuthUserPayload {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      email: payload.email,
      systemRole: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
