// src/common/guards/jwt-block.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtBlockGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Run the normal JWT validation first
    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 🛑 Check if user is blocked
    if (user?.isBlocked) {
      throw new ForbiddenException(
        'Your account has been blocked. Please contact support.',
      );
    }

    return true;
  }
}
