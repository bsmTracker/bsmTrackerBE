import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { AuthGuard } from './guards/auth.guard';
import { RegisterUserDto } from '../user/dto/registerUser.dto';
import { GetUser } from './decorator/userinfo.decorator';
import { User } from 'src/user/entity/user.entity';

@Controller('/oauth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('bsm')
  async bsm_login(
    @Res({ passthrough: true }) res: Response,
    @Query('code') authCode: string,
  ): Promise<any> {
    // return authCode;
    return this.authService.oauthBsm(res, authCode);
  }

  @Post('/getUser')
  @UseGuards(AuthGuard)
  isAuthenticated(@Req() req: Request, @GetUser() user: User) {
    console.log('67890');
    return user;
  }

  @Post('/signup')
  @UsePipes(ValidationPipe)
  async registerAccount(
    @Req() req: Request,
    @Body() userDto: RegisterUserDto,
  ): Promise<any> {
    return await this.authService.registerUser(userDto);
  }

  @Post('/login')
  async login(
    @Body() userDto: UserLoginDto,
    @Res() res: Response,
  ): Promise<any> {
    return await this.authService.login(res, userDto);
  }

  @Post('/logout')
  @UseGuards(AuthGuard)
  logout(@Req() req: Request, @Res() res: Response): any {
    // res.setHeader('Authorization', 'Bearer ');
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json();
  }
}
