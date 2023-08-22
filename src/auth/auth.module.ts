import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGuard } from './guards/auth.guard';
import { UserModule } from 'src/user/user.module';

import { UserService } from 'src/user/user.service';
import { Token } from './entity/token.entity';
import { WSAuthUtil } from './WS-auth.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
  ],
  exports: [TypeOrmModule, WSAuthUtil, JwtModule, AuthService, UserService],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserService, WSAuthUtil],
})
export class AuthModule {}
