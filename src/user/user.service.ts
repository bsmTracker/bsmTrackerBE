import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entity/user.entity';
import { randomBytes } from 'crypto';
import { RegisterUserDto } from './dto/registerUser.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByFields(options: FindOneOptions): Promise<User | undefined> {
    return await this.userRepository.findOne(options);
  }

  public async createUser(
    registerDto: RegisterUserDto,
  ): Promise<User | undefined> {
    let userFind: User = await this.findByFields({
      where: { email: registerDto.email },
    });
    if (userFind) {
      throw new HttpException(
        '아이디 또는 이메일이 이미 사용중입니다!',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.transformPassword(registerDto);
    const nUser = new User();
    nUser.email = registerDto.email;
    nUser.name = registerDto.name;
    nUser.password = registerDto.password;
    nUser.save();
    return nUser;
  }

  private async transformPassword(user: RegisterUserDto): Promise<void> {
    user.password = await bcrypt.hash(user.password, 10);
    return Promise.resolve();
  }

  public async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatch = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('비밀번호가 올바르지않습니다');
    }
    return;
  }

  public async getUserById(userId: number): Promise<User> {
    const user: User = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 유저입니다');
    }
    return user;
  }

  public async getUserByFields(fields: any): Promise<User> {
    const user: User = await this.userRepository.findOne(fields);
    return user;
  }
}

// async deleteUser(userId : number) {
//     const {myProfiles} = await this.userRepository.findOne(userId, {relations : ['myProfiles']});
//     myProfiles.forEach(async (myProfile) => {
//         this.trainService.deleteTrainProfile(userId, myProfile.trainId);
//     })
//     await this.userRepository.delete({
//         id:userId
//     });
// }
