import {
  Controller,
  Delete,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Level } from 'src/auth/decorator/level.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { LevelGuard } from 'src/auth/guards/level.guard';
import { LevelType } from 'src/user/level-type';
import { AudioService } from './audio.service';
import * as multer from 'multer';

@Controller('audio')
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Post()
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multer.memoryStorage(),
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File): Promise<any> {
    //mp3인지 체크
    if (!file.originalname.includes('mp3')) {
      throw new HttpException('파일은 MP3형식이어야함', HttpStatus.BAD_REQUEST);
    }
    return await this.audioService.saveLocalAudio(
      `_${Date.now()}` + file.originalname,
      file.buffer,
    );
  }

  @Delete('/:id')
  async deleteAudio(@Param('id', ParseIntPipe) id: number) {
    await this.audioService.removeAudio(id);
  }
}
