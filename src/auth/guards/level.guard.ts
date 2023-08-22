import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from 'src/user/entity/user.entity';
import { LevelType } from 'src/user/level-type';

@Injectable()
export class LevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const level = this.reflector.get<LevelType>('level', context.getHandler());
    if (!level) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    const user: User = request.user as User;

    return user.level === level;
  }
}
