import { Module } from '@nestjs/common';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import Playlist from './entity/playlist.entity';
import { TrackModule } from 'src/track/track.module';
import Track from 'src/track/entity/Track.entity';

@Module({
  imports: [TrackModule, TypeOrmModule.forFeature([Playlist, Track])],
  controllers: [PlaylistController],
  providers: [PlaylistService],
  exports: [TypeOrmModule, PlaylistService],
})
export class PlaylistModule {}
