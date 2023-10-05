import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from 'src/user/entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthTokenMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private readonly reflector: Reflector,
  ) {}
  public async use(req: Request, res: Response, next: () => void) {
    const decoded = await this.verifyUser(req);
    let user = null;
    try {
      user = await this.userService.getUserById(decoded.id);
    } catch (e) {}
    req.user = user;
    return next();
  }

  private async verifyUser(req: Request): Promise<User> {
    let user: User = null;
    try {
      const headers = req.headers;
      const accessToken = headers['access_token'] as string;
      const decoded: User = await this.jwtService.verify(accessToken, {
        secret: process.env.SECRET_KEY,
      });
      user = decoded;
    } catch (e) {}
    return user;
  }
}
