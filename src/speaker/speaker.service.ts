import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { SpeakerGateway } from './speaker.gateway';

@Injectable()
export class SpeakerService implements OnModuleInit {
  @Inject(forwardRef(() => SpeakerGateway))
  private speakerGateway: SpeakerGateway;
  static volume: number = 0;
  static inited = false;

  onModuleInit() {
    SpeakerService.inited = true;
    this.setVolume(0);
  }

  setVolume(volume: number) {
    if (volume < 0 || volume > 100) return;
    SpeakerService.volume = volume;
    this.speakerGateway.server.emit('volume', volume);
  }

  listenVolume() {
    return SpeakerService.volume;
  }
}
