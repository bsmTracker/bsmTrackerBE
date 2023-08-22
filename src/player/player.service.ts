import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  forwardRef,
} from '@nestjs/common';
import { Audio } from 'src/audio/entity/audio.entity';
import { PlayerGateway } from './player.gateway';

@Injectable()
export class PlayerService implements OnApplicationBootstrap {
  static nowPlaying: any = null;

  @Inject(forwardRef(() => PlayerGateway))
  private playerGateway: PlayerGateway;

  onApplicationBootstrap() {
    this.pause();
  }

  play(audio: Audio) {
    this.pause();
    let src = '';
    src = audio.path;
    PlayerService.nowPlaying = {
      audio,
      src,
    };
    setTimeout(() => {
      PlayerService.nowPlaying = null;
    }, audio.duration_ms);
    this.playerGateway.server.emit('play', PlayerService.nowPlaying);
  }

  pause() {
    this.playerGateway.server.emit('pause');
    PlayerService.nowPlaying = null;
  }
}
