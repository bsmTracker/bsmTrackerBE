import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { ScheduleService } from 'src/schedule/schedule.service';
import { PlayScheduleDetailDto } from './dto/playScheduleDetail.dto';
import {
  PlaySchedule,
  ScheduleEnum,
} from '../play-schedule/entity/playSchedule.entity';
import { PlayScheduleTimeDto } from './dto/playScheduleTime';
import { Between, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Time } from './type/Time.type';
import { PlayerService } from 'src/player/player.service';
import { AudioService } from 'src/audio/audio.service';
import { SpeakerService } from 'src/speaker/speaker.service';
import { TtsService } from 'src/tts/tts.service';
import Track from 'src/track/entity/Track.entity';
import { PlayScheduleGateway } from './play-schedule.gateway';
import { Server, Socket } from 'socket.io';
import { Tts } from 'src/tts/entity/tts.entity';
import { TimeUtil } from 'src/Utils/time';

// 은근 고친게 많다, 무턱대고 서두르는것은 좋지 않다 하하하핳 ,,,,,,;;;;
// 발견하고 고쳐서 행복 하다 하하하핳 ,,,,,,,,,,

@Injectable()
export class PlayScheduleService implements OnModuleInit {
  constructor(
    private scheduleService: ScheduleService,
    private audioService: AudioService,
    private ttsService: TtsService,
    @Inject(forwardRef(() => PlayerService))
    private playerService: PlayerService,
    private speakerService: SpeakerService,
    @InjectRepository(PlaySchedule)
    private playScheduleRepository: Repository<PlaySchedule>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
  ) {
    //스케쥴 싹다 불러와서 서버에 스케쥴 채우기
  }

  @Inject(forwardRef(() => PlayScheduleGateway))
  private playScheduleGateway: PlayScheduleGateway;

  static inited = false;
  static playScheduleTimeoutList = [];
  private static currentPlaySchedule: PlaySchedule = null;

  async onModuleInit() {
    await this.loadPlaySchedule();
  }

  async loadPlaySchedule() {
    if (PlayScheduleService.inited) return;
    await this.stopPlaySchedule();
    const playSchedules = await this.playScheduleRepository.find({
      where: {
        active: true,
      },
    });
    playSchedules.forEach(async (playSchedule: PlaySchedule) => {
      try {
        if (this.isExpiredSchedule(playSchedule)) {
          await this.deActivePlaySchedule(playSchedule.id);
          return;
        }
        await this.activePlaySchedule(playSchedule.id);
      } catch (e) {}
    });
    PlayScheduleService.inited = true;
  }

  private setNowPlaySchedule(playSchedule: PlaySchedule | null) {
    PlayScheduleService.currentPlaySchedule = playSchedule;
    this.sendNowPlaySchedule();
  }

  getNowPlaySchedule() {
    return PlayScheduleService.currentPlaySchedule;
  }

  public sendNowPlaySchedule(
    socket: Socket | Server = this.playScheduleGateway.server,
  ) {
    socket.emit('now-play-schedule', this.getNowPlaySchedule());
  }
  static broadcastTimeout = null;
  static beforePlayScheduleId: number = null;
  static broadcastTtsId: number = null;
  static beforeVolume: number = null;

  async broadcastLive(content: string, volume: number) {
    if (PlayScheduleService.broadcastTtsId) {
      await this.ttsService.removeTts(PlayScheduleService.broadcastTtsId);
      PlayScheduleService.broadcastTtsId = null;
    }
    if (PlayScheduleService.broadcastTimeout) {
      clearTimeout(PlayScheduleService.broadcastTimeout);
      PlayScheduleService.broadcastTimeout = null;
    }
    const tts: Tts = await this.ttsService.saveTts(content);
    PlayScheduleService.broadcastTtsId = tts.id;
    PlayScheduleService.beforePlayScheduleId =
      PlayScheduleService.beforePlayScheduleId || this.getNowPlaySchedule()?.id;
    PlayScheduleService.beforeVolume =
      PlayScheduleService.beforeVolume || this.playerService.getVolume();
    if (PlayScheduleService.beforePlayScheduleId) {
      await this.stopPlaySchedule();
    }
    this.speakerService.setRelayStatus(true);
    this.playerService.setVolume(volume);
    this.playerService.play(tts.audio, 0);
    PlayScheduleService.broadcastTimeout = setTimeout(async () => {
      if (PlayScheduleService.broadcastTtsId) {
        await this.ttsService.removeTts(PlayScheduleService.broadcastTtsId);
      }
      if (!PlayScheduleService.beforePlayScheduleId) {
        this.speakerService.setRelayStatus(false);
        this.playerService.setVolume(0);
      } else {
        let playSchedule: PlaySchedule =
          await this.playScheduleRepository.findOne({
            where: {
              id: PlayScheduleService.beforePlayScheduleId,
            },
          });
        if (!playSchedule) {
          this.speakerService.setRelayStatus(false);
          this.playerService.setVolume(0);
        } else {
          const nowPlayerVolume = this.playerService.getVolume();
          if (nowPlayerVolume === volume) {
            playSchedule['volume'] = PlayScheduleService.beforeVolume;
          } else {
            playSchedule['volume'] = nowPlayerVolume;
          }
          if (await this.canBeCurrentPlaySchedule(playSchedule)) {
            await this.processPlaySchedule(playSchedule);
          }
        }
      }
      PlayScheduleService.broadcastTtsId = null;
      PlayScheduleService.beforeVolume = null;
      PlayScheduleService.beforePlayScheduleId = null;
      PlayScheduleService.broadcastTimeout = null;
    }, tts.duration_ms);
  }

  async findOverlappingPlayScheduleForActive(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) return null;
    if (playSchedule.active) return null;
    return await this.findOverlappingSchedule(playSchedule);
  }

  async addPlaySchedule(
    playScheduleTimeDto: PlayScheduleDetailDto,
  ): Promise<PlaySchedule> {
    await this.checkPlayScheduleTimePolicy(playScheduleTimeDto);
    if (playScheduleTimeDto.ttsId || playScheduleTimeDto.startMelodyId) {
      const duplicatedP = await this.playScheduleRepository.findOne({
        where: [
          {
            ttsId: playScheduleTimeDto.ttsId,
          },
          {
            startMelodyId: playScheduleTimeDto.startMelodyId,
          },
        ],
      });
      if (duplicatedP) {
        throw new ConflictException(
          'TTSId 또는 startMelodyId는 이미 등록되어 있는 스케쥴이 있습니다.',
        );
      }
    }
    return await this.playScheduleRepository.save({
      ...playScheduleTimeDto,
      //DB에서 시간 계산하기 위해서
      startTimeSize: TimeUtil.getTimeSize_s(playScheduleTimeDto.startTime),
      endTimeSize: TimeUtil.getTimeSize_s(playScheduleTimeDto.endTime),
    });
  }

  isExpiredSchedule(playSchedule: PlaySchedule) {
    if (playSchedule.scheduleType !== ScheduleEnum.EVENT) {
      return false;
    }
    const nowTimeSize = TimeUtil.getTimeSize_s(TimeUtil.getNowTime());
    const playScheduleEndTimeSize = TimeUtil.getTimeSize_s(
      playSchedule.endTime,
    );
    const todayStr = TimeUtil.getTodayStr();
    if (
      playSchedule.endDate <= todayStr &&
      nowTimeSize >= playScheduleEndTimeSize
    ) {
      return true;
    }
    return false;
  }

  async deletePlaySchedule(playScheduleId: number): Promise<void> {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) {
      throw new NotFoundException();
    }
    if (playSchedule.active) {
      await this.deActivePlaySchedule(playSchedule.id);
    }
    if (playSchedule?.startMelody?.id) {
      await this.audioService.removeAudio(playSchedule.startMelody.id);
    }
    if (playSchedule?.tts?.id) {
      await this.ttsService.removeTts(playSchedule.tts.id);
    }
    await this.playScheduleRepository.remove(playSchedule);
  }

  async editPlaySchedule(
    playScheduleId: number,
    playScheduleDto: PlayScheduleDetailDto,
  ): Promise<void> {
    await this.checkPlayScheduleTimePolicy(playScheduleDto);
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) {
      throw new NotFoundException('기존 재생일정을 찾을 수 없음');
    }
    if (playSchedule.active) {
      //켜져 있다면 일단 스케쥴 끄기
      await this.deActivePlaySchedule(playSchedule.id);
    }
    if (playSchedule?.startMelodyId !== playScheduleDto?.startMelodyId) {
      if (playSchedule?.startMelody) {
        await this.audioService.removeAudio(playSchedule.startMelody.id);
      }
    }
    if (playSchedule?.ttsId !== playScheduleDto?.ttsId) {
      if (playSchedule?.tts) {
        await this.ttsService.removeTts(playSchedule.tts.id);
      }
    }
    await this.playScheduleRepository.update(
      {
        id: playScheduleId,
      },
      {
        ...playScheduleDto,
        // startTimeSize: TimeUtil.getTimeSize_s(playScheduleDto.startTime),
        // endTimeSize: TimeUtil.getTimeSize_s(playScheduleDto.endTime),
        active: false,
        id: playScheduleId,
      },
    );
  }

  async canBeCurrentPlaySchedule(playSchedule: PlaySchedule): Promise<boolean> {
    const nowTimeSize = TimeUtil.getTimeSize_s(TimeUtil.getNowTime());
    if (playSchedule.active === false) {
      return false;
    }
    //현재 시간이 스케쥴이 등록된 동작 시간인지 체크
    if (
      (nowTimeSize >= TimeUtil.getTimeSize_s(playSchedule.startTime) &&
        nowTimeSize <= TimeUtil.getTimeSize_s(playSchedule.endTime)) === false
    ) {
      return false;
    }
    //만약 스케쥴 타입이 DAYS_OF_WEEK 타입이라면
    if (playSchedule.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      // 오늘 요일에 포함된 스케쥴인지 체크
      const todayDayOfWeek = new Date().getDay();
      if (!playSchedule.daysOfWeek.includes(todayDayOfWeek)) {
        return false;
      }
    }
    //만약 스케쥴 타입이 EVENT 타입이라면
    if (playSchedule.scheduleType === ScheduleEnum.EVENT) {
      //스케쥴 시작 날과 끝날에 오늘 날짜가 포함되어있는지 체크
      const todayDate = TimeUtil.getTodayStr();
      if (
        (todayDate >= playSchedule.startDate &&
          todayDate <= playSchedule.endDate) === false
      ) {
        return false;
      }
    }

    if (playSchedule.scheduleType !== ScheduleEnum.EVENT) {
      const sameTimeEventSchedule = await this.findOverlappingEventSchedule({
        startTime: playSchedule.startTime,
        endTime: playSchedule.endTime,
        startDate: playSchedule.startDate,
        endDate: playSchedule.endDate,
      });
      if (sameTimeEventSchedule) {
        return false;
      }
    }
    return true;
  }

  static trackTimeout = null;
  async playlistTrackPlay(playlistId: number, order = 1, startTime_ms = 0) {
    if (!playlistId) return;
    this.playerService.pause();
    const track = await this.trackRepository.findOne({
      where: {
        order,
        playlistId,
      },
    });
    if (!track) {
      return;
    }
    this.playerService.play(track.audio, startTime_ms);
    const timeout = track.duration_ms - startTime_ms;
    PlayScheduleService.trackTimeout = setTimeout(() => {
      this.playlistTrackPlay(playlistId, order + 1, 0);
    }, timeout);
  }

  async processPlaySchedule(playSchedule: PlaySchedule) {
    let timeStamp_ms = 0;
    const nowTimeSize = TimeUtil.getNowTime();
    const playScheduleStartTime = playSchedule.startTime;
    const delayTimeStamp_ms =
      TimeUtil.getTimeSize_s(
        TimeUtil.calcTime(nowTimeSize, '-', playScheduleStartTime),
      ) * 1000;
    PlayScheduleService.playScheduleTimeoutList = [];
    this.setNowPlaySchedule(playSchedule);
    this.speakerService.setRelayStatus(true);
    this.playerService.setVolume(playSchedule.volume);
    if (playSchedule.startMelody) {
      if (
        delayTimeStamp_ms <
        playSchedule.startMelody.duration_ms + timeStamp_ms
      ) {
        let timeout = timeStamp_ms - delayTimeStamp_ms;
        let startTime = timeout < 0 ? delayTimeStamp_ms - timeStamp_ms : 0;
        const startMelodyTimeout = setTimeout(async () => {
          this.playerService.play(playSchedule.startMelody, startTime);
        }, timeout);
        PlayScheduleService.playScheduleTimeoutList.push(startMelodyTimeout);
      }
      timeStamp_ms += playSchedule.startMelody.duration_ms;
    }
    if (playSchedule.tts) {
      if (
        delayTimeStamp_ms <
        playSchedule.tts.audio.duration_ms + timeStamp_ms
      ) {
        let timeout = timeStamp_ms - delayTimeStamp_ms;
        let startTime = timeout < 0 ? delayTimeStamp_ms - timeStamp_ms : 0;
        const startTtsTimeout = setTimeout(async () => {
          this.playerService.play(playSchedule.tts.audio, startTime);
        }, timeout);
        PlayScheduleService.playScheduleTimeoutList.push(startTtsTimeout);
      }
      timeStamp_ms += playSchedule.tts.audio.duration_ms;
    }
    let order = 1;
    let playlistId = playSchedule.playlistId;
    if (playSchedule.playlist) {
      while (true) {
        const startTrack = await this.trackRepository.findOne({
          where: {
            order,
            playlistId,
          },
        });
        if (!startTrack) {
          break;
        }
        if (delayTimeStamp_ms < startTrack.duration_ms + timeStamp_ms) {
          let timeout = timeStamp_ms - delayTimeStamp_ms;
          let startTime = timeout < 0 ? delayTimeStamp_ms - timeStamp_ms : 0;
          const trackPlayTimeout = setTimeout(async () => {
            await this.playlistTrackPlay(
              playSchedule.playlist.id,
              order,
              startTime,
            );
          }, timeout);
          PlayScheduleService.playScheduleTimeoutList.push(trackPlayTimeout);
          break;
        }
        order += 1;
        timeStamp_ms += startTrack.duration_ms;
      }
    }
    return;
  }

  async stopPlaySchedule() {
    this.setNowPlaySchedule(null);
    this.speakerService.setRelayStatus(false);
    this.playerService.setVolume(0);
    this.playerService.pause();
    PlayScheduleService.playScheduleTimeoutList.map((ScheduleTimeOut) => {
      clearTimeout(ScheduleTimeOut);
    });
    if (PlayScheduleService.trackTimeout) {
      clearInterval(PlayScheduleService.trackTimeout);
    }
    PlayScheduleService.playScheduleTimeoutList = [];
  }

  isSameCurrentPlaySchedule(playSchedule: PlaySchedule) {
    const currentPlaySchedule = this.getNowPlaySchedule();
    if (currentPlaySchedule?.id === playSchedule.id) {
      console.log(currentPlaySchedule.id, playSchedule.id);
      return true;
    } else {
      return false;
    }
  }

  // 긴급정지
  async emergencyStop() {
    // tts도 정지시키는거
    await this.stopPlaySchedule();
  }

  async activePlaySchedule(playScheduleId: number) {
    let playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    if (this.isExpiredSchedule(playSchedule))
      throw new ConflictException(
        '해당 스케쥴은 만료된 스케쥴입니다. (활성화 할 수 없음)',
      );
    if (playSchedule.active) {
      throw new ConflictException('이미 해당 스케쥴은 활성화되어있습니다.');
    }
    const exsistPlaySchedule = await this.findOverlappingSchedule(playSchedule);
    if (exsistPlaySchedule) {
      // 겹치는 스케쥴이 있어서 활성화 할 수 없습니다
      throw new ConflictException(
        `"${exsistPlaySchedule?.name}"스케쥴과 겹쳐 활성화 할 수 없습니다!`,
      );
    }
    let scheduleStartTimeStr = TimeUtil.getSchedulerTimeString(
      playSchedule.startTime,
    );
    this.scheduleService.addCronJob(
      `start-schedule-${playSchedule.id}`,
      scheduleStartTimeStr,
      async () => {
        try {
          if (await this.canBeCurrentPlaySchedule(playSchedule)) {
            await this.processPlaySchedule(playSchedule);
          }
        } catch (e) {}
      },
    );
    let scheduleEndTimeStr = TimeUtil.getSchedulerTimeString(
      playSchedule.endTime,
    );
    this.scheduleService.addCronJob(
      `stop-schedule-${playSchedule.id}`,
      scheduleEndTimeStr,
      async () => {
        try {
          if (this.isExpiredSchedule(playSchedule)) {
            await this.deActivePlaySchedule(playSchedule.id);
          }
          if (this.isSameCurrentPlaySchedule(playSchedule)) {
            await this.stopPlaySchedule();
          }
        } catch (e) {}
      },
    );
    await this.playScheduleRepository.update(
      {
        id: playSchedule.id,
      },
      {
        active: true,
      },
    );
    playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (await this.canBeCurrentPlaySchedule(playSchedule)) {
      await this.processPlaySchedule(playSchedule);
    }
  }

  async deActivePlaySchedule(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    if (this.isSameCurrentPlaySchedule(playSchedule)) {
      await this.stopPlaySchedule();
    }
    this.scheduleService.deleteCronJob(`start-schedule-${playSchedule.id}`);
    this.scheduleService.deleteCronJob(`stop-schedule-${playSchedule.id}`);
    await this.playScheduleRepository.update(
      {
        id: playSchedule.id,
      },
      {
        active: false,
      },
    );
  }

  async checkPlayScheduleTimePolicy(
    playScheduleTimeDto: PlayScheduleTimeDto,
  ): Promise<void> {
    if (
      JSON.stringify(playScheduleTimeDto.startTime) ===
      JSON.stringify(playScheduleTimeDto.endTime)
    ) {
      throw new BadRequestException(
        '스케쥴 시작시간과 종료시간은 같게 설정 할 수 없어요',
      );
    }
    if (playScheduleTimeDto.scheduleType === ScheduleEnum.EVENT) {
      if (playScheduleTimeDto.startDate > playScheduleTimeDto.endDate) {
        throw new BadRequestException(
          '재생 시작 일자가 재생 마지막 일보다 뒤로 갈 수 없습니다',
        );
      }
    }
  }

  async getPlaySchedules() {
    return await this.playScheduleRepository.find();
  }

  async findOverlappingSchedule(
    playSchedule: PlayScheduleTimeDto,
  ): Promise<PlaySchedule> {
    let exsistPlaySchedule: PlaySchedule = null;
    if (playSchedule.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      exsistPlaySchedule = await this.findOverlappingDaysOfWeekSchedule({
        startTime: playSchedule.startTime,
        endTime: playSchedule.endTime,
        daysOfWeek: playSchedule.daysOfWeek,
      });
    }
    if (playSchedule.scheduleType === ScheduleEnum.EVENT) {
      exsistPlaySchedule = await this.findOverlappingEventSchedule({
        startTime: playSchedule.startTime,
        endTime: playSchedule.endTime,
        startDate: playSchedule.startDate,
        endDate: playSchedule.endDate,
      });
    }
    return exsistPlaySchedule;
  }

  private async findOverlappingDaysOfWeekSchedule({
    startTime,
    endTime,
    daysOfWeek,
  }: {
    startTime: Time;
    endTime: Time;
    daysOfWeek: number[];
  }): Promise<PlaySchedule | null> {
    let findedSchedules: PlaySchedule[] =
      await this.playScheduleRepository.find({
        where: {
          scheduleType: ScheduleEnum.DAYS_OF_WEEK,
          active: true,
        },
      });
    findedSchedules = findedSchedules.filter((findedSchedule) => {
      for (let i = 0; i < daysOfWeek.length; i++) {
        if (findedSchedule.daysOfWeek.includes(daysOfWeek[i])) {
          return true;
        }
      }
      return false;
    });
    findedSchedules = findedSchedules.filter((findedSchedule) =>
      this.isOverlappingTime(
        {
          startTime,
          endTime,
        },
        {
          startTime: findedSchedule.startTime,
          endTime: findedSchedule.endTime,
        },
      ),
    );
    return findedSchedules?.[0];
  }

  private async findOverlappingEventSchedule({
    startTime,
    endTime,
    startDate,
    endDate,
  }: {
    startTime: Time;
    endTime: Time;
    startDate: string;
    endDate: string;
  }): Promise<PlaySchedule | null> {
    let playSchedules: PlaySchedule[] = await this.playScheduleRepository.find({
      where: [
        {
          scheduleType: ScheduleEnum.EVENT,
          active: true,
          startDate: Between(startDate, endDate),
        },
        {
          scheduleType: ScheduleEnum.EVENT,
          active: true,
          endDate: Between(startDate, endDate),
        },
      ],
    });
    playSchedules = playSchedules.filter((findedSchedule: PlaySchedule) =>
      this.isOverlappingTime(
        {
          startTime,
          endTime,
        },
        {
          startTime: findedSchedule.startTime,
          endTime: findedSchedule.endTime,
        },
      ),
    );
    //시간 겹치는거 찾는거해야한다.
    return playSchedules?.[0];
  }

  isOverlappingTime(
    aTime: {
      startTime: Time;
      endTime: Time;
    },
    bTime: {
      startTime: Time;
      endTime: Time;
    },
  ) {
    const isOverlapping =
      TimeUtil.isOverlappingTime(
        aTime.startTime,
        bTime.startTime,
        aTime.endTime,
        bTime.endTime,
      ) ||
      TimeUtil.isOverlappingTime(
        bTime.startTime,
        aTime.startTime,
        bTime.endTime,
        aTime.endTime,
      );
    return isOverlapping;
  }
}
