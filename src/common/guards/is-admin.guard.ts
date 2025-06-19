import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_KEY } from '../decorators/is-admin.decorator';

@Injectable()
export class IsAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const adminOnly = this.reflector.get<boolean>(
      IS_ADMIN_KEY,
      context.getHandler(),
    );

    if (!adminOnly) return true; // No restriction

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.isAdmin) return true;

    throw new ForbiddenException('Unauthorized access: Admins only');
  }
}