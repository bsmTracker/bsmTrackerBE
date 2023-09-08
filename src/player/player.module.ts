import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerGateway } from './player.gateway';
import { AudioModule } from 'src/audio/audio.module';
import { PlayerController } from './player.controller';
import { TtsModule } from 'src/tts/tts.module';
import { TtsService } from 'src/tts/tts.service';

@Module({
  imports: [AudioModule, TtsModule],
  providers: [PlayerService, PlayerGateway, TtsService],
  exports: [PlayerService, PlayerGateway],
  controllers: [PlayerController],
})
export class PlayerModule {}
