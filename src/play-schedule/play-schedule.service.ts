import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  forwardRef,
} from '@nestjs/common';
import { ScheduleService } from 'src/schedule/schedule.service';
import { PlayScheduleDetailDto } from './dto/playScheduleDetail.dto';
import {
  PlaySchedule,
  ScheduleEnum,
} from '../play-schedule/entity/playSchedule.entity';
import { PlayScheduleTimeDto } from './dto/playScheduleTime';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Time } from './type/Time.type';
import { PlayerService } from 'src/player/player.service';
import { AudioService } from 'src/audio/audio.service';
import { SpeakerService } from 'src/speaker/speaker.service';
import { TtsService } from 'src/tts/tts.service';
import Track from 'src/track/entity/Track.entity';
import { PlayScheduleGateway } from './play-schedule.gateway';

// 은근 고친게 많다, 무턱대고 서두르는것은 좋지 않다 하하하핳 ,,,,,,;;;;
// 발견하고 고쳐서 행복 하다 하하하핳 ,,,,,,,,,,

@Injectable()
export class PlayScheduleService implements OnApplicationBootstrap {
  constructor(
    private scheduleService: ScheduleService,
    private audioService: AudioService,
    private ttsService: TtsService,
    private playerService: PlayerService,
    private speakerService: SpeakerService,
    @InjectRepository(PlaySchedule)
    private playScheduleRepository: Repository<PlaySchedule>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
  ) {
    //스케쥴 싹다 불러와서 서버에 스케쥴 채우기
  }

  static playScheduleTimeoutList = [];
  private static currentPlaySchedule: PlaySchedule = null;

  @Inject(forwardRef(() => PlayScheduleGateway))
  private playScheduleGateway: PlayScheduleGateway;

  async onApplicationBootstrap() {
    await this.loadPlaySchedule();
  }

  async loadPlaySchedule() {
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
  }

  private setNowPlaySchedule(playSchedule: PlaySchedule | null) {
    PlayScheduleService.currentPlaySchedule = playSchedule;
    this.sendNowPlaySchedule();
  }

  private getNowPlaySchedule() {
    return PlayScheduleService.currentPlaySchedule;
  }

  public sendNowPlaySchedule() {
    this.playScheduleGateway.server.emit(
      'now-play-schedule',
      this.getNowPlaySchedule(),
    );
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
      startTimeSize: this.getTimeSize_s(playScheduleTimeDto.startTime),
      endTimeSize: this.getTimeSize_s(playScheduleTimeDto.endTime),
    });
  }

  isExpiredSchedule(playSchedule: PlaySchedule) {
    if (playSchedule.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      return false;
    }
    const nowTimeSize = this.getTimeSize_s(this.getNowTime());
    const playScheduleEndTimeSize = this.getTimeSize_s(playSchedule.endTime);
    const todayStr = this.getTodayStr();
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
        startTimeSize: this.getTimeSize_s(playScheduleDto.startTime),
        endTimeSize: this.getTimeSize_s(playScheduleDto.endTime),
        active: false,
        id: playScheduleId,
      },
    );
  }

  async canBeCurrentPlaySchedule(playSchedule: PlaySchedule): Promise<boolean> {
    const nowTimeSize = this.getTimeSize_s(this.getNowTime());
    const todayStr = this.getTodayStr();
    // ** 만약 daysOfWeek 형식의 재생일정이라면
    // 재생함수 실행 전 오늘 이시간 재생일정이 없을시 실행해야함.
    // date형 재생일정은 day형 재생일정보다 우선순위가 높기 때문에 양보해야함.
    if (playSchedule.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      const today = new Date();
      if (!playSchedule.daysOfWeek.includes(today.getDay())) {
        return false;
      }
      const todayStr: string = this.getTodayStr();
      const nowDateTimePlaySchedule = await this.findOverlappingEventSchedule({
        startDate: todayStr,
        endDate: todayStr,
        startTime: playSchedule.startTime,
        endTime: playSchedule.endTime,
      });
      if (nowDateTimePlaySchedule) {
        //오늘 우선순위가 높은 재생일정이 있기때문에 양보
        return false;
      }
    }
    if (playSchedule.scheduleType === ScheduleEnum.EVENT) {
      if (playSchedule.endDate > todayStr) {
        return false;
      }
      if (playSchedule.startDate < todayStr) {
        return false;
      }
    }
    const startTimeSize = this.getTimeSize_s(playSchedule.startTime);
    const endTimeSize = this.getTimeSize_s(playSchedule.endTime);
    if (nowTimeSize >= startTimeSize && nowTimeSize <= endTimeSize) {
      return true;
    }
    return false;
  }

  //nowTimeStampSize_ms <--- 현재 얼마나 시간이 지났는지
  async startPlaySchedule(playSchedule: PlaySchedule) {
    this.setNowPlaySchedule(playSchedule);
    let timeStamp_ms = 0;
    let term = 500;
    PlayScheduleService.playScheduleTimeoutList = [];
    this.speakerService.setVolume(playSchedule.volume);
    if (playSchedule.startMelody) {
      const startMelodyTimeout = setTimeout(async () => {
        this.playerService.play(playSchedule.startMelody);
      }, timeStamp_ms);
      PlayScheduleService.playScheduleTimeoutList.push(startMelodyTimeout);
      timeStamp_ms += playSchedule.startMelody.duration_ms + term;
    }
    if (playSchedule.tts) {
      const startTTSTimeout = setTimeout(async () => {
        this.playerService.play(playSchedule.tts.audio);
      }, timeStamp_ms);
      PlayScheduleService.playScheduleTimeoutList.push(startTTSTimeout);
      timeStamp_ms += playSchedule.tts.audio.duration_ms + term;
    }
    if (playSchedule.playlist) {
      const playlistTimeout = setTimeout(async () => {
        await this.playlistPlay(playSchedule.playlist.id);
      }, timeStamp_ms);
      PlayScheduleService.playScheduleTimeoutList.push(playlistTimeout);
    }
  }

  static trackTimeout = null;

  async playlistPlay(playlistId: number, order = 1) {
    if (!playlistId) return;
    const track = await this.trackRepository.findOne({
      where: {
        order,
        playlistId,
      },
    });
    if (!track) {
      this.playerService.pause();
      return;
    }
    this.playerService.play(track.audio);
    PlayScheduleService.trackTimeout = setTimeout(() => {
      this.playlistPlay(playlistId, order + 1);
    }, track.duration_ms);
  }

  async stopPlaySchedule() {
    this.setNowPlaySchedule(null);
    this.speakerService.setVolume(0);
    PlayScheduleService.playScheduleTimeoutList.map((ScheduleTimeOut) => {
      clearTimeout(ScheduleTimeOut);
    });
    if (PlayScheduleService.trackTimeout) {
      clearInterval(PlayScheduleService.trackTimeout);
    }
    this.playerService.pause();
    PlayScheduleService.playScheduleTimeoutList = [];
  }

  async activePlaySchedule(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    if (this.isExpiredSchedule(playSchedule))
      throw new ConflictException(
        '해당 스케쥴은 만료된 스케쥴입니다. (활성화 할 수 없음)',
      );
    const exsistPlaySchedule = await this.findOverlappingSchedule(playSchedule);

    if (exsistPlaySchedule) {
      // 겹치는 스케쥴이 있어서 활성화 할 수 없습니다
      throw new ConflictException(
        `"${exsistPlaySchedule?.name}"스케쥴과 겹쳐 활성화 할 수 없습니다!`,
      );
    }

    let scheduleStartTimeStr = this.getSchedulerTimeString(
      playSchedule.startTime,
    );
    this.scheduleService.addCronJob(
      `start-schedule-${playSchedule.id}`,
      scheduleStartTimeStr,
      async () => {
        try {
          if (await this.canBeCurrentPlaySchedule(playSchedule)) {
            await this.startPlaySchedule(playSchedule);
          }
        } catch (e) {}
      },
    );
    let scheduleEndTimeStr = this.getSchedulerTimeString(playSchedule.endTime);
    this.scheduleService.addCronJob(
      `stop-schedule-${playSchedule.id}`,
      scheduleEndTimeStr,
      async () => {
        try {
          if (this.isExpiredSchedule(playSchedule)) {
            await this.deActivePlaySchedule(playSchedule.id);
          }
          const currentPlaySchedule = this.getNowPlaySchedule();
          if (currentPlaySchedule?.id === playSchedule?.id) {
            await this.stopPlaySchedule();
          }
        } catch (e) {}
      },
    );
    console.log('good');
    await this.playScheduleRepository.update(
      {
        id: playSchedule.id,
      },
      {
        active: true,
      },
    );
  }

  async deActivePlaySchedule(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    const currentPlaySchedule = this.getNowPlaySchedule();
    if (currentPlaySchedule?.id === playSchedule?.id) {
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
    console.log(playScheduleTimeDto);
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
    const startTimeSize = this.getTimeSize_s(startTime);
    const endTimeSize = this.getTimeSize_s(endTime);
    findedSchedules = findedSchedules.filter((findedSchedule) => {
      if (
        this.findOverlappingTime(
          findedSchedule.startTimeSize,
          startTimeSize,
          findedSchedule.endTimeSize,
          endTimeSize,
        )
      ) {
        return true;
      }
      if (
        this.findOverlappingTime(
          startTimeSize,
          findedSchedule.startTimeSize,
          endTimeSize,
          findedSchedule.endTimeSize,
        )
      ) {
        return true;
      }
      return false;
      //시간 겹치는거 찾는거해야한다.
    });
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
      where: {
        scheduleType: ScheduleEnum.EVENT,
        active: true,
      },
    });
    const startTimeSize = this.getTimeSize_s(startTime);
    const endTimeSize = this.getTimeSize_s(endTime);
    playSchedules = playSchedules.filter((findedSchedule: PlaySchedule) => {
      const isOverlappingTime = this.findOverlappingTime(
        startTimeSize,
        findedSchedule.startTimeSize,
        endTimeSize,
        findedSchedule.endTimeSize,
      );
      if (isOverlappingTime === false) {
        return true;
      }
      if (
        startDate >= findedSchedule.startDate &&
        startDate <= findedSchedule.endDate
      ) {
        return true;
      }
      if (
        findedSchedule.startDate >= startDate &&
        findedSchedule.startDate <= endDate
      ) {
        return true;
      }
      if (
        endDate >= findedSchedule.startDate &&
        endDate <= findedSchedule.endDate
      ) {
        return true;
      }
      if (
        findedSchedule.endDate >= startDate &&
        findedSchedule.endDate <= endDate
      ) {
        return true;
      }
      return false;
    });
    //시간 겹치는거 찾는거해야한다.
    return playSchedules?.[0];
  }

  findOverlappingTime(
    aStartTimeSize,
    bStartTimeSize,
    aEndTimeSize,
    bEndTimeSize,
  ) {
    if (aStartTimeSize > aEndTimeSize) {
      if (bStartTimeSize > bEndTimeSize) {
        //안돼임마
        return true;
      }
      if (bStartTimeSize < bEndTimeSize) {
        if (bEndTimeSize >= aStartTimeSize) {
          //안돼임마
          return true;
        }

        if (bStartTimeSize <= aEndTimeSize) {
          //안돼임마
          return true;
        }
      }
    }
    if (aStartTimeSize < aEndTimeSize) {
      if (bStartTimeSize < bEndTimeSize) {
        if (bStartTimeSize > aStartTimeSize && bStartTimeSize < aEndTimeSize) {
          return true;
        }
        if (bEndTimeSize > aStartTimeSize && bEndTimeSize < aEndTimeSize) {
          return true;
          //안돼 임마
        }
      }
      if (bStartTimeSize > bEndTimeSize) {
        if (bStartTimeSize < aEndTimeSize) {
          return true;
          //안돼 임마
        }
        if (bEndTimeSize > aStartTimeSize) {
          return true;
          //안돼 임마
        }
      }
    }
    return false;
  }

  /** UTILL */

  getSchedulerTimeString(time: Time): string {
    return `${time.second} ${time.minute} ${time.hour} * * *`;
  }

  getTodayStr() {
    const date = new Date();
    let offset = date.getTimezoneOffset() * 60000; //ms단위라 60000곱해줌
    let dateOffset = new Date(date.getTime() - offset).toISOString();
    return dateOffset.substring(0, 10);
  }

  getTimeSize_s(time: Time) {
    return time.hour * 3600 + time.minute * 60 + time.second;
  }

  parseTime(timeSize: number) {
    const hour = Math.floor(timeSize / 3600);
    const minute = Math.floor((timeSize % 3600) / 60);
    const second = timeSize % 60;
    return { hour, minute, second };
  }

  getNowTime() {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
  }

  calcTime(time: Time, calcSign: '+' | '-', calcTime: Time): Time {
    let { hour, minute, second } = time;
    hour += 24; // 시간 + 24시간
    second = second + minute * 60 + hour * 60 * 60; // 시간을 전부 초으로 변환
    if (calcSign === '-') {
      second -=
        calcTime.hour * 60 * 60 + calcTime.minute * 60 + calcTime.second;
    }
    if (calcSign === '+') {
      second +=
        calcTime.hour * 60 * 60 + calcTime.minute * 60 + calcTime.second;
    }
    hour = second / 3600;
    hour = Math.floor(hour % 24); // 시간이 24시간을 넘을 수 있으니 %24
    minute = second / 60;
    minute = Math.floor(minute % 60); // 분이 60을 넘을 수 있으니 %60
    second = second % 60; //초가 60을 넘을 수 있으니 % 60
    return {
      hour,
      minute,
      second,
    };
  }
}
