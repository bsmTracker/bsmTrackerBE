import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Level } from 'src/auth/decorator/level.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { LevelGuard } from 'src/auth/guards/level.guard';
import { LevelType } from 'src/user/level-type';
import { TtsService } from './tts.service';

@Controller('tts')
export class TtsController {
  constructor(private TtsService: TtsService) {}

  @Post()
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async uploadTTS(@Body('tts') textContent: string) {
    if (!textContent) {
      return null;
    }
    return await this.TtsService.saveTts(textContent);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async deleteTTS(@Param('id', ParseIntPipe) id: number) {
    await this.TtsService.removeTts(id);
  }
}
