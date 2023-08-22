import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SpeakerService } from './speaker.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Level } from 'src/auth/decorator/level.decorator';
import { LevelType } from 'src/user/level-type';
import { VolumeDto } from './dto/speaker.dto';

@Controller('speaker')
export class SpeakerController {
  constructor(private speakerService: SpeakerService) {}

  @Post('/')
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  @UsePipes(ValidationPipe)
  async setVolume(@Body() volumeDto: VolumeDto) {
    this.speakerService.setVolume(volumeDto.volume);
  }
}
