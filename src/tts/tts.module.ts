import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { AudioService } from 'src/audio/audio.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tts } from './entity/tts.entity';
import { AudioModule } from 'src/audio/audio.module';
import { TtsSubscriber } from './entity/subscriber/tts.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([Tts]), AudioModule],
  providers: [TtsService, AudioService, TtsSubscriber],
  controllers: [TtsController],
  exports: [TypeOrmModule, TtsService],
})
export class TtsModule {}
