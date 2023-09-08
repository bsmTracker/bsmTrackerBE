import { Module } from '@nestjs/common';
import { SpeakerService } from './speaker.service';
import { SpeakerGateway } from './speaker.gateway';

@Module({
  providers: [SpeakerService, SpeakerGateway],
  exports: [SpeakerService, SpeakerGateway],
  controllers: [],
})
export class SpeakerModule {}
