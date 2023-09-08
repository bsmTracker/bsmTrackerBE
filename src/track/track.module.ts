import { Module } from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistService } from 'src/playlist/playlist.service';
import PlaylistTrack from './entity/Track.entity';
import Playlist from 'src/playlist/entity/playlist.entity';
import { AuthModule } from '../auth/auth.module';
import { YoutubeService } from 'src/youtube/youtube.service';
import { YoutubeModule } from 'src/youtube/youtube.module';
import { AudioModule } from 'src/audio/audio.module';
import { AudioService } from 'src/audio/audio.service';
import { PlayerModule } from 'src/player/player.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleService } from 'src/schedule/schedule.service';

@Module({
  imports: [
    YoutubeModule,
    AuthModule,
    AudioModule,
    TypeOrmModule.forFeature([PlaylistTrack, Playlist]),
    PlayerModule,
    ScheduleModule,
  ],
  controllers: [TrackController],
  providers: [
    TrackService,
    YoutubeService,
    PlaylistService,
    AudioService,
    ScheduleService,
  ],
  exports: [
    PlaylistService,
    TrackService,
    YoutubeService,
    TypeOrmModule,
    AudioService,
    ScheduleService,
  ],
})
export class TrackModule {}
