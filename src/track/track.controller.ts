import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TrackService } from './track.service';
import { TrackSaveDto } from './dto/track.save.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Level } from 'src/auth/decorator/level.decorator';
import { LevelType } from 'src/user/level-type';
import { PreviewYoutubeTrack } from 'src/youtube/type/youtube.type';

@Controller('track')
export class TrackController {
  constructor(private trackService: TrackService) {}

  //검색 API
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  @Get('/search')
  async search(
    @Query('q') q: string,
    @Query('playlistId', ParseIntPipe) playlistId: number,
  ): Promise<(PreviewYoutubeTrack & { save: boolean })[]> {
    return await this.trackService.searchTrack({
      q,
      playlistId,
    });
  }

  @Post('/save')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  async getMyVotedTrackIdList(@Body() trackSaveDto: TrackSaveDto) {
    return await this.trackService.saveTrack(trackSaveDto);
  }

  @Post('/changeTrackOrder')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  async changeTrackOrder(
    @Body('fromIndex') fromIndex: number,
    @Body('toIndex') toIndex: number,
    @Body('playlistId') playlistId: number,
  ) {
    console.log(fromIndex, toIndex, playlistId);
    return await this.trackService.changeTrackIndex(
      playlistId,
      fromIndex,
      toIndex,
    );
  }

  @Post('/unSave')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  @Level(LevelType.ADMIN)
  async getMySavedTrackIdList(@Body() trackSaveDto: TrackSaveDto) {
    return await this.trackService.unSaveTrack(trackSaveDto);
  }
}
