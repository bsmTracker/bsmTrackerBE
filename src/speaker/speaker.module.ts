import { Module } from '@nestjs/common';
import { SpeakerService } from './speaker.service';
import { SpeakerGateway } from './speaker.gateway';
import { SpeakerController } from './speaker.controller';

@Module({
  providers: [SpeakerService, SpeakerGateway],
  exports: [SpeakerService, SpeakerGateway],
  controllers: [SpeakerController],
})
export class SpeakerModule {}
