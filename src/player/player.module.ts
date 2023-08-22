import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerGateway } from './player.gateway';
import { AudioModule } from 'src/audio/audio.module';
import { PlayerController } from './player.controller';

@Module({
  imports: [AudioModule],
  providers: [PlayerService, PlayerGateway],
  exports: [PlayerService, PlayerGateway],
  controllers: [PlayerController],
})
export class PlayerModule {}
