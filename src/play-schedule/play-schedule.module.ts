import { Module } from '@nestjs/common';
import { PlayScheduleController } from './play-schedule.controller';
import { PlayScheduleService } from './play-schedule.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaySchedule } from './entity/playSchedule.entity';
import { ScheduleService } from 'src/schedule/schedule.service';
import { AudioService } from 'src/audio/audio.service';
import { AudioModule } from 'src/audio/audio.module';
import { TtsService } from 'src/tts/tts.service';
import { TtsModule } from 'src/tts/tts.module';
import { PlayerModule } from 'src/player/player.module';
import { PlayerService } from 'src/player/player.service';
import { SpeakerService } from 'src/speaker/speaker.service';
import { SpeakerModule } from 'src/speaker/speaker.module';
import { TrackModule } from 'src/track/track.module';
import { PlayScheduleGateway } from './play-schedule.gateway';
import { TrackService } from 'src/track/track.service';
import { PlaylistService } from 'src/playlist/playlist.service';
import { DayOfWeek } from './entity/dayOfWeek.entity';
import { Time } from './entity/time.entity';
import { DateEntity } from './entity/date.entity';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([PlaySchedule, DayOfWeek, DateEntity, Time]),
    TrackModule,
    AudioModule,
    TtsModule,
    PlayerModule,
    SpeakerModule,
  ],
  controllers: [PlayScheduleController],
  providers: [
    PlayScheduleGateway,
    PlaylistService,
    AudioService,
    ScheduleService,
    TrackService,
    TtsService,
    PlayerService,
    SpeakerService,
    PlayScheduleService,
  ],
  exports: [TypeOrmModule, ScheduleService, PlayScheduleService],
})
export class PlayScheduleModule {}
