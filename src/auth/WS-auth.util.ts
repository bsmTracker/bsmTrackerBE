import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from 'src/user/entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';

import { UserService } from 'src/user/user.service';
import { Socket } from 'socket.io';

@Injectable()
export class WSAuthUtil {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  async authClient(client: Socket) {
    const token: string = this.parseCookie(client, 'token');
    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.SECRET_KEY,
      });
      return plainToClass(User, user);
    } catch (e) {}
    let refreshToken = this.parseCookie(client, 'refreshToken');
    if (!refreshToken) {
      return null;
    }
    try {
      refreshToken = this.jwtService.verify(refreshToken, {
        secret: process.env.SECRET_KEY,
      }).refreshToken;
    } catch (error) {
      return null;
    }
    const tokenInfo = await this.authService.getRecentRefreshToken(
      refreshToken,
    );

    if (!tokenInfo) {
      return null;
    }

    const userInfo = await this.userService.getUserById(tokenInfo.userId);
    //refreshToken 인증시간 체크
    const passedTime = new Date().getTime() - tokenInfo.createdAt.getTime();
    if (passedTime > 24 * 60 * 1000 * 60 * 1) {
      //refreshToken 만료
      return null;
    }
    return userInfo;
  }

  private parseCookie(client: Socket, paramName: string) {
    return client.request.headers.cookie
      ?.split('; ')
      .find((cookie) => cookie.startsWith(`${paramName}`))
      ?.split('=')[1];
  }
}
