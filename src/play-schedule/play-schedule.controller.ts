import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PlayScheduleService } from './play-schedule.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { LevelGuard } from 'src/auth/guards/level.guard';
import { LevelType } from 'src/user/level-type';
import { Level } from 'src/auth/decorator/level.decorator';
import { PlayScheduleDetailDto } from './dto/playScheduleDetail.dto';
import { PlaySchedule } from './entity/playSchedule.entity';
import { BroadcastDetailDto } from './dto/broadcastDetail.dto';

@Controller('play-schedule')
export class PlayScheduleController {
  constructor(private playScheduleService: PlayScheduleService) {}
  //  o
  @Post('/')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  @UsePipes(ValidationPipe)
  async addPlaySchedule(
    @Body() addPlayScheduleDto: PlayScheduleDetailDto,
  ): Promise<any> {
    return await this.playScheduleService.addPlaySchedule(addPlayScheduleDto);
  }

  //  o
  @Post('/:id/findOverlappingPlaySchedule')
  @UsePipes(ValidationPipe)
  async canActive(
    @Param('id', ParseIntPipe) playScheduleId: number,
  ): Promise<PlaySchedule> {
    return await this.playScheduleService.findOverlappingPlayScheduleForActive(
      playScheduleId,
    );
  }

  @Get('/')
  async getPlayschedules(): Promise<PlaySchedule[]> {
    return await this.playScheduleService.getPlaySchedules();
  }

  @Post('/:id/toggleActivation')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async setScheduleActivation(
    @Param('id', ParseIntPipe) playScheduleId: number,
  ) {
    await this.playScheduleService.togglePlayScheduleActiveStatus(
      playScheduleId,
    );
  }

  // o
  @Put('/:playScheduleId')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  @UsePipes(ValidationPipe)
  async editPlaySchedule(
    @Body() editPlaytimeDto: PlayScheduleDetailDto,
    @Param('playScheduleId', ParseIntPipe) playScheduleId: number,
  ): Promise<void> {
    await this.playScheduleService.editPlaySchedule(
      playScheduleId,
      editPlaytimeDto,
    );
  }

  //  o
  @Delete('/:playScheduleId')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async deletePlaySchedule(
    @Param('playScheduleId', ParseIntPipe) playScheduleId: number,
  ): Promise<void> {
    await this.playScheduleService.deletePlaySchedule(playScheduleId);
  }

  @Post('/broadcast')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  @UsePipes(ValidationPipe)
  async broadcast(@Body() broadcastDetailDto: BroadcastDetailDto) {
    await this.playScheduleService.broadcastLive(
      broadcastDetailDto.content,
      broadcastDetailDto.volume,
    );
  }

  @Post('/emergencyStop')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async emergencyStop() {
    await this.playScheduleService.emergencyStop();
  }
}
