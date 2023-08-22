import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { TrackModule } from './track/track.module';
import { PlaylistModule } from './playlist/playlist.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleModule as Schedule_Module } from './schedule/schedule.module';
import { PlayScheduleModule } from './play-schedule/play-schedule.module';
import { AudioModule } from './audio/audio.module';
import { SpeakerModule } from './speaker/speaker.module';
import { TtsModule } from './tts/tts.module';
import { YoutubeModule } from './youtube/youtube.module';
import { PlayerModule } from './player/player.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `./env/${process.env.NODE_ENV}.env`,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/*/entity/*.entity.{js,ts}'],
      // logging: true,
      synchronize: true,
      timezone: 'Asia/Seoul',
      // subscribers: [__dirname + '/*/entity/subscriber/*.subscriber.{js,ts}'],
    }),
    ScheduleModule.forRoot(),
    Schedule_Module,
    AuthModule,
    UserModule,
    TrackModule,
    PlaylistModule,
    PlayScheduleModule,
    AudioModule,
    SpeakerModule,
    TtsModule,
    YoutubeModule,
    PlayerModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
