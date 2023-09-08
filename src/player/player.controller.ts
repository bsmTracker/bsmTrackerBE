import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Level } from 'src/auth/decorator/level.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { VolumeDto } from 'src/speaker/dto/speaker.dto';
import { LevelType } from 'src/user/level-type';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get('/')
  @Render('player.ejs')
  async player() {
    return {
      endpoint: process.env.SERVER_ENDPOINT,
    };
  }

  @Post('/volume')
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  @UsePipes(ValidationPipe)
  async setVolume(@Body() volumeDto: VolumeDto) {
    this.playerService.setVolume(volumeDto.volume);
    this.playerService.sendVolume();
  }
}
