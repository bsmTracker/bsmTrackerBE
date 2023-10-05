import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartTrack } from './entity/chart-track.entity';
import { Like } from './entity/like.entity';
import { ChartService } from './chart.service';
import { ChartGateway } from './chart.gateway';
import { YoutubeService } from 'src/youtube/youtube.service';
import { PlaylistModule } from 'src/playlist/playlist.module';
import { YoutubeModule } from 'src/youtube/youtube.module';

@Module({
  imports: [
    YoutubeModule,
    PlaylistModule,
    TypeOrmModule.forFeature([ChartTrack, Like]),
  ],
  providers: [ChartService, ChartGateway, YoutubeService],
  controllers: [ChartController],
  exports: [TypeOrmModule],
})
export class ChartModule {}
