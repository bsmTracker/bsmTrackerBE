import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
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
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerService } from 'src/player/player.service';
import { AudioService } from 'src/audio/audio.service';
import { SpeakerService } from 'src/speaker/speaker.service';
import { TtsService } from 'src/tts/tts.service';
import Track from 'src/track/entity/Track.entity';
import { PlayScheduleGateway } from './play-schedule.gateway';
import { Server, Socket } from 'socket.io';
import { Tts } from 'src/tts/entity/tts.entity';
import { TimeUtil } from 'src/Utils/time';
import { DayOfWeek } from './entity/dayOfWeek.entity';
import { Time } from './entity/time.entity';
import { TimeType } from './type/Time.type';
import { DateEntity } from './entity/date.entity';

// 은근 고친게 많다, 무턱대고 서두르는것은 좋지 않다 하하하핳 ,,,,,,;;;;
// 발견하고 고쳐서 행복 하다 하하하핳 ,,,,,,,,,,

@Injectable()
export class PlayScheduleService implements OnApplicationBootstrap {
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
    @InjectRepository(DayOfWeek)
    private daysOfWeekRepository: Repository<DayOfWeek>,
    @InjectRepository(DateEntity)
    private dateRepository: Repository<DateEntity>,
    @InjectRepository(Time)
    private timeRepository: Repository<Time>,
  ) {
    //스케쥴 싹다 불러와서 서버에 스케쥴 채우기
  }

  @Inject(forwardRef(() => PlayScheduleGateway))
  private playScheduleGateway: PlayScheduleGateway;

  private static playScheduleTimeoutList = [];
  private static currentPlaySchedule: PlaySchedule = null;

  async onApplicationBootstrap() {
    await this.loadPlaySchedule();
  }

  private async loadPlaySchedule() {
    await this.stopPlaySchedule();
    const activatedPlaySchedules = await this.playScheduleRepository.find({
      where: {
        active: true,
      },
    });
    activatedPlaySchedules.forEach(async (playSchedule: PlaySchedule) => {
      try {
        await this.activePlaySchedule(playSchedule.id);
      } catch (e) {}
    });
  }

  private setNowPlaySchedule(playSchedule: PlaySchedule | null) {
    PlayScheduleService.currentPlaySchedule = playSchedule;
    this.sendNowPlaySchedule();
  }

  getCurrentPlaySchedule() {
    return PlayScheduleService.currentPlaySchedule;
  }

  public sendNowPlaySchedule(
    socket: Socket | Server = this.playScheduleGateway.server,
  ) {
    socket.emit('now-play-schedule', this.getCurrentPlaySchedule());
  }

  private static broadcastTimeout = null;
  private static beforePlayScheduleId: number = null;
  private static broadcastTtsId: number = null;
  private static beforeVolume: number = null;
  private static targetVolume: number = null;

  public async broadcastLive(content: string, volume: number) {
    await this.stopBroadcastLive();
    const tts: Tts = await this.ttsService.saveTts(content);
    PlayScheduleService.broadcastTtsId = tts.id;
    PlayScheduleService.targetVolume = volume;
    PlayScheduleService.beforePlayScheduleId =
      PlayScheduleService.beforePlayScheduleId ||
      this.getCurrentPlaySchedule()?.id;
    PlayScheduleService.beforeVolume =
      PlayScheduleService.beforeVolume || this.playerService.getVolume();
    if (PlayScheduleService.beforePlayScheduleId) {
      await this.stopPlaySchedule();
    }
    this.speakerService.setRelayStatus(true);
    this.playerService.setVolume(volume);
    this.playerService.play(tts.audio, 0);
    PlayScheduleService.broadcastTimeout = setTimeout(async () => {
      PlayScheduleService.broadcastTimeout = null;
      await this.stopBroadcastLive();
    }, tts.duration_ms);
  }

  public async stopBroadcastLive() {
    if (PlayScheduleService.broadcastTtsId) {
      this.playerService.pause();
      await this.ttsService.removeTts(PlayScheduleService.broadcastTtsId);
    }
    if (PlayScheduleService.broadcastTimeout) {
      clearTimeout(PlayScheduleService.broadcastTimeout);
    }
    let replayplaySchedule: PlaySchedule | null =
      PlayScheduleService?.beforePlayScheduleId &&
      (await this.playScheduleRepository.findOne({
        where: {
          id: PlayScheduleService.beforePlayScheduleId,
        },
      }));
    if (!replayplaySchedule) {
      if (
        PlayScheduleService.beforePlayScheduleId ===
        PlayScheduleService?.currentPlaySchedule?.id
      ) {
        this.speakerService.setRelayStatus(false);
        this.playerService.setVolume(0);
        this.playerService.pause();
      } else {
        // 그대로 놔둠
      }
    } else {
      const nowPlayerVolume = this.playerService.getVolume();
      if (nowPlayerVolume === PlayScheduleService.targetVolume) {
        replayplaySchedule['volume'] = PlayScheduleService.beforeVolume;
      } else {
        replayplaySchedule['volume'] = nowPlayerVolume;
      }
      if (await this.canBeCurrentPlaySchedule(replayplaySchedule)) {
        await this.processPlaySchedule(replayplaySchedule);
      }
    }
    PlayScheduleService.broadcastTimeout = null;
    PlayScheduleService.broadcastTtsId = null;
    PlayScheduleService.beforeVolume = null;
    PlayScheduleService.targetVolume = null;
    PlayScheduleService.beforePlayScheduleId = null;
    PlayScheduleService.broadcastTimeout = null;
  }

  public async findOverlappingPlayScheduleForActive(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    if (playSchedule.active)
      throw new HttpException(
        '스케쥴이 이미 활성화 되어있습니다!',
        HttpStatus.CONFLICT,
      );
    return await this.findOverlappingSchedule(playSchedule);
  }

  public async addPlaySchedule(
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

    let daysOfWeek = [];
    let dateList = [];

    if (playScheduleTimeDto.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      daysOfWeek = await Promise.all(
        playScheduleTimeDto.daysOfWeek.map(async (dayOfWeek: DayOfWeek) => {
          const day = new DayOfWeek();
          day.day = dayOfWeek.day;
          return await this.daysOfWeekRepository.save(day);
        }),
      );
    }
    delete playScheduleTimeDto.daysOfWeek;

    if (playScheduleTimeDto.scheduleType === ScheduleEnum.EVENT) {
      dateList = await Promise.all(
        playScheduleTimeDto.dateList?.map(async (date_) => {
          const date = new DateEntity();
          date.date = date_.date;
          return await date.save();
        }),
      );
    }
    delete playScheduleTimeDto.dateList;

    const startTime = await this.timeRepository.save(
      playScheduleTimeDto.startTime,
    );
    const endTime = await this.timeRepository.save(playScheduleTimeDto.endTime);
    delete playScheduleTimeDto.startTime;
    delete playScheduleTimeDto.endTime;

    return await this.playScheduleRepository.save({
      ...playScheduleTimeDto,
      daysOfWeek,
      dateList,
      startTime,
      endTime,
      //DB에서 시간 계산하기 위해서
    });
  }

  public async deletePlaySchedule(playScheduleId: number): Promise<void> {
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
    await this.timeRepository.remove(playSchedule.startTime);
    await this.timeRepository.remove(playSchedule.endTime);
    await this.playScheduleRepository.remove(playSchedule);
  }

  public async editPlaySchedule(
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
    await this.daysOfWeekRepository.delete({
      playScheduleId: playSchedule.id,
    });
    playScheduleDto.daysOfWeek.forEach(async (dayOfWeek: DayOfWeek) => {
      const day = new DayOfWeek();
      day.day = dayOfWeek.day;
      day.playScheduleId = playSchedule.id;
      return await this.daysOfWeekRepository.save(day);
    });
    delete playScheduleDto.daysOfWeek;
    await this.dateRepository.delete({
      playScheduleId: playSchedule.id,
    });
    playScheduleDto.dateList.forEach(async (dateE: DateEntity) => {
      const date = new DateEntity();
      date.date = dateE.date;
      date.playScheduleId = playSchedule.id;
      await this.dateRepository.save(date);
    });
    delete playScheduleDto.dateList;

    await this.timeRepository.update(
      {
        id: playSchedule.startTime.id,
      },
      playScheduleDto.startTime,
    );
    await this.timeRepository.update(
      {
        id: playSchedule.endTime.id,
      },
      playScheduleDto.endTime,
    );
    delete playScheduleDto.startTime;
    delete playScheduleDto.endTime;

    await this.playScheduleRepository.update(
      {
        id: playScheduleId,
      },
      {
        ...playScheduleDto,
        active: false,
        id: playScheduleId,
      },
    );
  }

  private async canBeCurrentPlaySchedule(
    playSchedule: PlaySchedule,
  ): Promise<boolean> {
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
      if (!playSchedule.daysOfWeek.find((d) => d.day == todayDayOfWeek)) {
        return false;
      }
    }
    //만약 스케쥴 타입이 EVENT 타입이라면
    if (playSchedule.scheduleType === ScheduleEnum.EVENT) {
      //스케쥴 시작 날과 끝날에 오늘 날짜가 포함되어있는지 체크
      const todayDate = TimeUtil.getTodayStr();
      if (!playSchedule.dateList.find((dateE) => dateE.date === todayDate)) {
        return false;
      }
    }

    if (playSchedule.scheduleType !== ScheduleEnum.EVENT) {
      const sameTimeEventSchedule = await this.findOverlappingEventSchedule({
        startTime: playSchedule.startTime,
        endTime: playSchedule.endTime,
        dateList: playSchedule.dateList,
      });
      if (sameTimeEventSchedule) {
        return false;
      }
    }
    return true;
  }

  static trackTimeout = null;
  private async playlistTrackPlay(
    playlistId: number,
    order = 1,
    startTime_ms = 0,
  ) {
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

  private async processPlaySchedule(playSchedule: PlaySchedule) {
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

  private async stopPlaySchedule() {
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

  // 긴급정지
  public async emergencyStop() {
    // tts도 정지시키는거
    await this.stopBroadcastLive();
    await this.stopPlaySchedule();
  }

  public async togglePlayScheduleActiveStatus(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (playSchedule.active === true) {
      await this.deActivePlaySchedule(playSchedule.id);
    } else if (playSchedule.active === false) {
      const overlappingPlaySchedule =
        await this.findOverlappingSchedule(playSchedule);
      if (overlappingPlaySchedule) {
        // 겹치는 스케쥴이 있어서 활성화 할 수 없습니다
        throw new ConflictException(
          `"${overlappingPlaySchedule?.name}"스케쥴과 겹쳐 활성화 할 수 없습니다!`,
        );
      }
      await this.activePlaySchedule(playSchedule.id);
    }
  }

  private async activePlaySchedule(playScheduleId: number) {
    let playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    const startScheduleFunc = async () => {
      try {
        if (await this.canBeCurrentPlaySchedule(playSchedule)) {
          await this.processPlaySchedule(playSchedule);
        }
      } catch (e) {}
    };
    const stopScheduleFunc = async () => {
      try {
        if (this.getCurrentPlaySchedule()?.id === playSchedule.id) {
          await this.stopPlaySchedule();
        }
      } catch (e) {}
    };

    const startScheduleId = `start-schedule-${playSchedule.id}`;
    const stopScheduleId = `stop-schedule-${playSchedule.id}`;
    if (playSchedule.scheduleType === ScheduleEnum.DAYS_OF_WEEK) {
      let daysOfWeekStr = '';
      playSchedule.daysOfWeek.forEach((daysOfWeek) => {
        daysOfWeekStr += `${daysOfWeek.day},`;
      });
      daysOfWeekStr = daysOfWeekStr.substring(0, daysOfWeekStr.length - 1);
      let scheduleStartTimeStr = `${playSchedule.startTime.second} ${playSchedule.startTime.minute} ${playSchedule.startTime.hour} * * ${daysOfWeekStr}`;
      let scheduleEndTimeStr = `${playSchedule.endTime.second} ${playSchedule.endTime.minute} ${playSchedule.endTime.hour} * * ${daysOfWeekStr}`;
      this.scheduleService.addCronJob(
        startScheduleId,
        scheduleStartTimeStr,
        startScheduleFunc,
      );
      this.scheduleService.addCronJob(
        stopScheduleId,
        scheduleEndTimeStr,
        stopScheduleFunc,
      );
    }
    if (playSchedule.scheduleType === ScheduleEnum.EVENT) {
      playSchedule.dateList.forEach(async (dateE: DateEntity) => {
        const dateTime = new Date(dateE.date);
        dateTime.setHours(playSchedule.startTime.hour);
        dateTime.setMinutes(playSchedule.startTime.minute);
        dateTime.setSeconds(playSchedule.startTime.second);
        this.scheduleService.addDateTimeJob(
          dateTime,
          startScheduleId,
          startScheduleFunc,
        );
        dateTime.setHours(playSchedule.endTime.hour);
        dateTime.setMinutes(playSchedule.endTime.minute);
        dateTime.setSeconds(playSchedule.endTime.second);
        this.scheduleService.addDateTimeJob(
          dateTime,
          stopScheduleId,
          stopScheduleFunc,
        );
      });
    }
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

  private async deActivePlaySchedule(playScheduleId: number) {
    const playSchedule = await this.playScheduleRepository.findOne({
      where: {
        id: playScheduleId,
      },
    });
    if (!playSchedule) throw new NotFoundException();
    if (this.getCurrentPlaySchedule()?.id === playSchedule.id) {
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

  private async checkPlayScheduleTimePolicy(
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
  }

  public async getPlaySchedules() {
    return await this.playScheduleRepository.find({
      order: {
        daysOfWeek: {
          day: 'ASC',
        },
        dateList: {
          date: 'ASC',
        },
      },
    });
  }

  private async findOverlappingSchedule(
    playSchedule: PlaySchedule,
  ): Promise<PlaySchedule> {
    // if(playSchedule.active === true) {
    //   return null;
    // }
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
        dateList: playSchedule.dateList,
      });
    }
    return exsistPlaySchedule;
  }

  private async findOverlappingDaysOfWeekSchedule({
    startTime,
    endTime,
    daysOfWeek,
  }: {
    startTime: TimeType;
    endTime: TimeType;
    daysOfWeek: DayOfWeek[];
  }): Promise<PlaySchedule | null> {
    let findedSchedules: PlaySchedule[] =
      await this.playScheduleRepository.find({
        where: {
          scheduleType: ScheduleEnum.DAYS_OF_WEEK,
          active: true,
          daysOfWeek: {
            day: In(daysOfWeek.map((d) => d.day)),
          },
        },
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
    dateList,
  }: {
    startTime: TimeType;
    endTime: TimeType;
    dateList: DateEntity[];
  }): Promise<PlaySchedule | null> {
    let playSchedules: PlaySchedule[] = await this.playScheduleRepository.find({
      where: {
        scheduleType: ScheduleEnum.EVENT,
        active: true,
        dateList: {
          date: In(dateList?.map((dateE) => dateE.date)),
        },
      },
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

  private isOverlappingTime(
    aTime: {
      startTime: TimeType;
      endTime: TimeType;
    },
    bTime: {
      startTime: TimeType;
      endTime: TimeType;
    },
  ) {
    const aStartTimeSize = TimeUtil.getTimeSize_s(aTime.startTime);
    const aEndTimeSize = TimeUtil.getTimeSize_s(aTime.endTime);

    const bStartTimeSize = TimeUtil.getTimeSize_s(bTime.startTime);
    const bEndTimeSize = TimeUtil.getTimeSize_s(bTime.endTime);

    if (aStartTimeSize >= bStartTimeSize && aStartTimeSize <= bEndTimeSize) {
      return true;
    }
    if (aEndTimeSize >= bStartTimeSize && aEndTimeSize <= bEndTimeSize) {
      return true;
    }
    if (bStartTimeSize >= aStartTimeSize && bStartTimeSize <= aEndTimeSize) {
      return true;
    }
    if (bEndTimeSize >= aStartTimeSize && bEndTimeSize <= aEndTimeSize) {
      return true;
    }
    return false;
  }
}
