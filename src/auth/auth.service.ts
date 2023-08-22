import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entity/user.entity';
import { RegisterUserDto } from '../user/dto/registerUser.dto';
import { UserService } from 'src/user/user.service';
import { Token } from './entity/token.entity';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import BsmOauth, { BsmOauthError, BsmOauthErrorType } from 'bsm-oauth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {
    this.bsmOauth = new BsmOauth(
      process.env.BSM_OAUTH_CLIENT_ID,
      process.env.BSM_OAUTH_CLIENT_SECRET,
    );
  }
  private bsmOauth: BsmOauth;

  async registerUser(newUser: RegisterUserDto): Promise<number> {
    const user: User = await this.userService.createUser(newUser);
    return user.id;
  }

  async setJwtToken(
    res: Response,
    user: User,
  ): Promise<{
    refreshToken: string;
    accessToken: string;
  }> {
    const accessToken = this.jwtService.sign(
      { ...user },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );
    const refreshToken = this.jwtService.sign(
      {
        refreshToken: (await this.createToken(user.id)).token,
      },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '24h',
      },
    );
    res.cookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    });
    res.cookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      maxAge: 24 * 60 * 1000 * 60 * 1,
    });
    return {
      refreshToken,
      accessToken,
    };
  }

  async login(res: Response, userLoginDto: UserLoginDto): Promise<void> {
    let userFind: User = await this.userService.findByFields({
      where: { email: userLoginDto.email },
    });
    if (!userFind) {
      throw new UnauthorizedException('아이디가 잘못되었습니다');
    }
    if (!userFind.password) {
      throw new UnauthorizedException('BSM으로 회원가입한 유저입니다!');
    }
    await this.userService.verifyPassword(
      userLoginDto.password,
      userFind.password,
    );
    const tokenObj = await this.setJwtToken(res, userFind);
    res.json(tokenObj);
  }

  async oauthBsm(res: Response, authCode: string): Promise<void> {
    let userToken: string;
    let resource: any;
    try {
      (userToken = await this.bsmOauth.getToken(authCode)),
        (resource = await this.bsmOauth.getResource(userToken));
    } catch (error) {
      if (error instanceof BsmOauthError) {
        switch (error.type) {
          case BsmOauthErrorType.INVALID_CLIENT: {
            throw new InternalServerErrorException('OAuth Failed');
          }
          case BsmOauthErrorType.AUTH_CODE_NOT_FOUND: {
            throw new NotFoundException('Authcode not found');
          }
          case BsmOauthErrorType.TOKEN_NOT_FOUND: {
            throw new NotFoundException('Token not found');
          }
        }
      }
      throw new InternalServerErrorException('OAuth Failed');
    }
    //이메일로 유저가 존재하는지 체크
    let userInfo: User = await this.userService.getUserByFields({
      email: resource.email,
    });
    if (!userInfo) {
      // 유저를 저장한다.
      const nUser = new User();
      nUser.email = resource.email;
      nUser.name = resource.nickname;
      await nUser.save();
      userInfo = await this.userService.getUserById(nUser.id);
    }
    await this.setJwtToken(res, userInfo);
    res.redirect(process.env.CLIENT_REDIRECT);
  }

  private async createToken(userId: number): Promise<Token> {
    const refreshToken = new Token();
    refreshToken.token = randomBytes(64).toString('hex');
    refreshToken.userId = userId;
    refreshToken.valid = true;
    await this.tokenRepository.save(refreshToken);
    return refreshToken;
  }

  async getRecentRefreshToken(token: string) {
    return await this.tokenRepository.findOne({
      where: {
        token,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
