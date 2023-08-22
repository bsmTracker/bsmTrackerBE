import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request?.cookies?.accessToken || request?.cookies?.refreshToken,
      ]),
      ignoreExpiration: false, //만료기한을 무시할것인가
      secretOrKey: process.env.SECRET_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, user: User): Promise<any> {
    if (user.id) {
      const userInfo: User = await this.userService.getUserById(user.id);
      console.log(userInfo);
      // req.user = userInfo;
      return userInfo;
    }
    const { refreshToken } = this.jwtService.verify(
      req?.cookies?.refreshToken,
      { secret: process.env.SECRET_KEY },
    );
    if (refreshToken === undefined) {
      throw new UnauthorizedException();
    }
    const tokenInfo = await this.authService.getRecentRefreshToken(
      refreshToken,
    );
    if (tokenInfo === null) {
      throw new UnauthorizedException();
    }
    const passedTime = new Date().getTime() - tokenInfo.createdAt.getTime();
    if (passedTime > 24 * 60 * 1000 * 60 * 1) {
      throw new UnauthorizedException('refreshToken은 이미 만료되었습니다');
    }
    const userInfo: User = await this.userService.getUserById(tokenInfo.userId);
    if (userInfo === null) {
      throw new UnauthorizedException();
    }
    const accessToken = this.jwtService.sign(
      { ...userInfo },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );
    req.res.cookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    });
    // req.user = userInfo;
    return userInfo;
  }
}

// npm install --save @nestjs/passport passport passport-local
// $ npm install --save-dev @types/passport-local
