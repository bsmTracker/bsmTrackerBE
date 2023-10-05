import {
  Body,
  Controller,
  Get,
  Post,
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
import { PassNotLoggedIn } from './decorator/pass_not_logged_in.decorator';

@Controller('/oauth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/getUser')
  @PassNotLoggedIn()
  isAuthenticated(@Req() req: Request, @GetUser() user: User) {
    return user;
  }

  @Post('/signup')
  @PassNotLoggedIn()
  @UsePipes(ValidationPipe)
  async registerAccount(@Body() userDto: RegisterUserDto): Promise<any> {
    return await this.authService.registerUser(userDto);
  }

  @Post('/login')
  @PassNotLoggedIn()
  async login(
    @Body() userDto: UserLoginDto,
    @Res() res: Response,
  ): Promise<any> {
    return await this.authService.login(res, userDto);
  }

  @Post('/bsmLogin')
  @PassNotLoggedIn()
  async bsmLogin(@Body('code') code: string, @Res() res: Response) {
    return await this.authService.bsmLogin(res, code);
  }
}
