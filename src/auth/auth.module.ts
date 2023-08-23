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
@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
  ],
  exports: [TypeOrmModule, JwtModule, AuthService, UserService],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserService],
})
export class AuthModule {}
