import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const allowNotLoggedIn =
      this.reflector.get<boolean>('pass_not_logged_in', context.getHandler()) ??
      false;
    if (!req.user) {
      if (!allowNotLoggedIn) {
        throw new UnauthorizedException('로그인해야합니다!');
      }
    }
    return true;
  }
}
