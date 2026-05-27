import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  isGuest: boolean;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', 'dev-secret'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role?: string;
    is_guest?: boolean;
    session_id?: string;
  }): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isGuest: payload.role === 'guest' || !!payload.is_guest,
      sessionId: payload.session_id,
    };
  }
}
