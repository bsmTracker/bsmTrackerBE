import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Level } from 'src/auth/decorator/level.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { LevelGuard } from 'src/auth/guards/level.guard';
import { LevelType } from 'src/user/level-type';
import { PlaylistService } from './playlist.service';
import Playlist from './entity/playlist.entity';

@Controller('playlist')
export class PlaylistController {
  constructor(private playlistService: PlaylistService) {}

  //만들어진 재생목록들 정보  o
  @Get('/')
  async getPlaylists(): Promise<Playlist[]> {
    return await this.playlistService.getPlaylists();
  }

  @Get('/:playlistId')
  async getPlaylistDetail(
    @Param('playlistId', ParseIntPipe) playlistId: number,
  ) {
    return await this.playlistService.getPlaylistDetail(playlistId);
  }

  //재생목록 만들기  o
  @Post('/')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async createPlaylist(@Body('name') name: string): Promise<Playlist> {
    if (!name) {
      throw new BadRequestException('재생목록이름을 보내주세요');
    }
    return await this.playlistService.createPlaylist(name);
  }

  //재생목록 삭제  o
  @Delete('/:playlistId')
  @UseGuards(AuthGuard, LevelGuard)
  @Level(LevelType.ADMIN)
  async deletePlaylist(
    @Param('playlistId', ParseIntPipe) playlistId: number,
  ): Promise<void> {
    await this.playlistService.deletePlaylist(playlistId);
  }
}
