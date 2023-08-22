import { Module } from '@nestjs/common';
import { PlayScheduleController } from './play-schedule.controller';
import { PlayScheduleService } from './play-schedule.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaySchedule } from './entity/playSchedule.entity';
import { ScheduleService } from 'src/schedule/schedule.service';
import { PlaylistModule } from 'src/playlist/playlist.module';
import { PlaylistService } from 'src/playlist/playlist.service';
import { AudioService } from 'src/audio/audio.service';
import { AudioModule } from 'src/audio/audio.module';
import { TtsService } from 'src/tts/tts.service';
import { TtsModule } from 'src/tts/tts.module';
import { PlayerModule } from 'src/player/player.module';
import { PlayerService } from 'src/player/player.service';
import { SpeakerService } from 'src/speaker/speaker.service';
import { SpeakerModule } from 'src/speaker/speaker.module';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([PlaySchedule]),
    PlaylistModule,
    AudioModule,
    TtsModule,
    PlayerModule,
    SpeakerModule,
  ],
  controllers: [PlayScheduleController],
  providers: [
    PlayScheduleService,
    ScheduleService,
    PlaylistService,
    AudioService,
    TtsService,
    PlayerService,
    SpeakerService,
  ],
  exports: [TypeOrmModule, ScheduleService, PlaylistService],
})
export class PlayScheduleModule {}
