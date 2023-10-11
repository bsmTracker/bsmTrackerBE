import {
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
import { Response } from 'express';
import BsmOauth, { BsmOauthError, BsmOauthErrorType } from 'bsm-oauth';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
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

  async createJwtToken(user: User): Promise<{
    accessToken: string;
  }> {
    const accessToken = this.jwtService.sign(
      { ...user },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '30d',
      },
    );
    return {
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
    await this.userService.verifyPassword(
      userLoginDto.password,
      userFind.password,
    );
    const tokenObj = await this.createJwtToken(userFind);
    res.json(tokenObj);
  }

  async bsmLogin(res: Response, authCode: string): Promise<void> {
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
      where: {
        email: resource.email,
      },
    });
    if (!userInfo) {
      // 유저를 저장한다.
      const newUser = new User();
      newUser.email = resource.email;
      newUser.name = resource?.[resource.role.toUpperCase]?.name ?? '?';
      await newUser.save();
      userInfo = await this.userService.getUserByFields({
        where: {
          email: resource.email,
        },
      });
    }
    const tokenObj = await this.createJwtToken(userInfo);
    res.json(tokenObj);
  }
}
