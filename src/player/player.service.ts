import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { Audio } from 'src/audio/entity/audio.entity';
import { PlayerGateway } from './player.gateway';
import { Server, Socket } from 'socket.io';
import { TimeUtil } from 'src/Utils/time';

type NowPlayingAudio = {
  audio: Audio;
  src: string;
  startTime: number;
};

@Injectable()
export class PlayerService implements OnModuleInit {
  private static volume: number = 0;
  static inited = false;

  @Inject(forwardRef(() => PlayerGateway))
  private playerGateway: PlayerGateway;

  onModuleInit() {
    if (PlayerService.inited) return;
    this.pause();
    this.setVolume(0);
    PlayerService.inited = true;
  }

  setVolume(volume: number) {
    if (volume < 0 || volume > 100) return;
    PlayerService.volume = volume;
    this.sendVolume();
  }

  getVolume() {
    return PlayerService.volume;
  }

  sendVolume(socket: Socket | Server = this.playerGateway.server) {
    socket.emit('volume', this.getVolume());
  }

  static startTime = null;
  private static nowPlayingAudio: NowPlayingAudio = null;
  setNowPlayingAudio(audio: NowPlayingAudio) {
    PlayerService.nowPlayingAudio = audio;
    PlayerService.startTime = TimeUtil.getNowTime();
    this.sendNowPlayingAudio();
  }

  sendNowPlayingAudio(socket: Socket | Server = this.playerGateway.server) {
    const nowPlayingAudio = this.getNowPlayingAudio();
    if (nowPlayingAudio) {
      socket.emit('play', nowPlayingAudio);
    } else {
      PlayerService.startTime = null;
      socket.emit('pause');
    }
  }

  getNowPlayingAudio() {
    const d = PlayerService.nowPlayingAudio;
    if (d) {
      const nowTime = TimeUtil.getNowTime();
      const diff_ms =
        TimeUtil.getTimeSize_s(
          TimeUtil.calcTime(nowTime, '-', PlayerService.startTime),
        ) * 1000;
      return {
        ...d,
        startTime: d.startTime + diff_ms,
      };
    }
    return null;
  }

  private static nowPlayingAudioTimeout = null;
  // this method can play only 1 music
  // if you play music while music is playing,
  // before music will stop, and new music will play
  play(audio: Audio, startTime = 0) {
    if (!audio) {
      return;
    }
    this.pause();
    let src = '';
    src += audio?.path;
    console.log('startTime ^&: ', startTime);
    PlayerService.nowPlayingAudio = {
      audio,
      src,
      startTime,
    };
    PlayerService.nowPlayingAudioTimeout = setTimeout(() => {
      try {
        this.pause();
      } catch (e) {}
    }, audio.duration_ms - startTime);
    this.setNowPlayingAudio(PlayerService.nowPlayingAudio);
  }

  pause() {
    if (PlayerService.nowPlayingAudioTimeout) {
      clearTimeout(PlayerService.nowPlayingAudioTimeout);
      PlayerService.nowPlayingAudioTimeout = null;
    }
    this.setNowPlayingAudio(null);
  }
}
