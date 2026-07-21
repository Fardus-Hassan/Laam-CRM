import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthUserPayload } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? 'laam-dev-jwt-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUserPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'ORG_DELETED',
        message: 'Account no longer exists',
      });
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException({
        code: 'USER_SUSPENDED',
        message: 'This account is suspended',
      });
    }

    if (user.organizationId) {
      if (!user.organization) {
        throw new UnauthorizedException({
          code: 'ORG_DELETED',
          message: 'This company account was removed',
        });
      }
      if (user.organization.status === 'suspended') {
        throw new UnauthorizedException({
          code: 'ORG_SUSPENDED',
          message: 'This company account is suspended',
        });
      }
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      organizationId: user.organizationId,
    };
  }
}
