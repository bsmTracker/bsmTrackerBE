import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { SpeakerGateway } from './speaker.gateway';
import { Server, Socket } from 'socket.io';

@Injectable()
export class SpeakerService implements OnModuleInit {
  @Inject(forwardRef(() => SpeakerGateway))
  private speakerGateway: SpeakerGateway;
  static relayStatus: boolean = false;

  static inited = false;
  onModuleInit() {
    if (SpeakerService.inited) return;
    this.setRelayStatus(false);
    SpeakerService.inited = true;
  }

  setRelayStatus(relayStatus: boolean) {
    SpeakerService.relayStatus = relayStatus;
    this.sendRelayStatus();
  }

  getRelayStatus() {
    return SpeakerService.relayStatus;
  }

  sendRelayStatus(socket: Socket | Server = this.speakerGateway.server) {
    socket.emit('relay', this.getRelayStatus());
  }
}
