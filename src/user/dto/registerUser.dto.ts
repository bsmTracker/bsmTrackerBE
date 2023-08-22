import { IsNotEmpty } from 'class-validator';
import { UserLoginDto } from './userLogin.dto';

export class RegisterUserDto extends UserLoginDto {
  @IsNotEmpty()
  name: string;
}
