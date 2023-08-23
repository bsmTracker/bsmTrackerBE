import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entity/user.entity';
import { RegisterUserDto } from '../user/dto/registerUser.dto';
import { UserService } from 'src/user/user.service';
import { Token } from './entity/token.entity';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import BsmOauth, { BsmOauthError, BsmOauthErrorType } from 'bsm-oauth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

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
        expiresIn: '24h',
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
    if (!userFind.password) {
      throw new UnauthorizedException('BSM으로 회원가입한 유저입니다!');
    }
    await this.userService.verifyPassword(
      userLoginDto.password,
      userFind.password,
    );
    const tokenObj = await this.createJwtToken(userFind);
    res.json(tokenObj);
  }
}
