import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { YoutubeService } from 'src/youtube/youtube.service';
import Track from './entity/Track.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import Playlist from 'src/playlist/entity/playlist.entity';
import { TrackSaveDto } from './dto/track.save.dto';
import {
  YoutubeTrack,
  PreviewYoutubeTrack,
} from 'src/youtube/type/youtube.type';
import { AudioService } from 'src/audio/audio.service';
import { ScheduleService } from 'src/schedule/schedule.service';
import { PlaylistService } from 'src/playlist/playlist.service';

@Injectable()
export class TrackService implements OnModuleInit {
  constructor(
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
    private readonly youtubeService: YoutubeService,
    private audioService: AudioService,
    private scheduleService: ScheduleService,
    private playlistService: PlaylistService,
  ) {}

  static init = false;

  async onModuleInit() {
    if (TrackService.init) return;
    const tracks = await this.trackRepository.find();
    await Promise.all(
      tracks.map(async (playlistTrack: Track) => {
        // 일어나서 만료된 URL을 대상으로 처음에는 주석없이, 그리고 주석있이 테스트하여 만료기한이 어떻게 되었는지 체크
        try {
          await this.updateTrack(playlistTrack.id);
        } catch (e) {}
      }),
    );
    TrackService.init = true;
  }

  /** */
  async searchTrack({
    q,
    playlistId,
  }: {
    q: string;
    playlistId?: number;
  }): Promise<(PreviewYoutubeTrack & { save: boolean })[]> {
    return await Promise.all(
      (await this.youtubeService.searchTracks(q)).map(
        async (youtubeTrack: PreviewYoutubeTrack) => {
          const saved = await this.trackRepository.findOne({
            where: {
              code: youtubeTrack.code,
              playlist: {
                id: playlistId,
              },
            },
          });
          return {
            ...youtubeTrack,
            save: saved ? true : false,
          };
        },
      ),
    );
  }

  async saveTrack(trackSaveDto: TrackSaveDto) {
    const playlist = await this.playlistRepository.findOne({
      where: {
        id: trackSaveDto.playlistId,
      },
    });
    if (!playlist) {
      throw new BadRequestException('플레이리스트를 찾을 수 없습니다');
    }
    let playlistTrack: Track = await this.trackRepository.findOne({
      where: {
        playlist: {
          id: trackSaveDto.playlistId,
        },
        code: trackSaveDto.code,
      },
    });
    if (playlistTrack) {
      throw new BadRequestException(
        '해당곡은 이미 플레이리스트에 저장되어있습니다',
      );
    }
    let youtubeTrack: YoutubeTrack =
      await this.youtubeService.getDetailedYoutubeTrack(trackSaveDto.code);
    if (!youtubeTrack) {
      throw new BadRequestException('추가하려는 곡을 추가 할 수 없습니다');
    }
    //2. 음악 조회시 재생 가능 여부 체크
    if (youtubeTrack.isLive) {
      throw new BadRequestException(
        '해당 곡은 지역 또는 연령 제한으로 인해 추가할 수 없습니다.',
      );
    }
    const lastTrack = await this.trackRepository.findOne({
      where: {
        playlist: {
          id: trackSaveDto.playlistId,
        },
      },
      order: {
        order: 'DESC',
      },
    });
    const audio = await this.audioService.saveCloudAudio(
      youtubeTrack.playUri,
      youtubeTrack.duration_ms,
    );
    playlistTrack = await this.trackRepository.save({
      playlist,
      code: youtubeTrack.code,
      name: youtubeTrack.name,
      image: youtubeTrack.image,
      duration_ms: youtubeTrack.duration_ms,
      audio: audio,
      order: lastTrack ? lastTrack.order + 1 : 1,
      playUriExpire: youtubeTrack.playUriExpire,
    });
    await this.playlistService.updatePlaylistMetaData(
      playlistTrack.playlist.id,
    );
    await this.setTrackUpdateSchedule(playlistTrack);
  }

  unSetTrackUpdateSchedule(playlistTrack: Track) {
    this.scheduleService.deleteCronJob(
      `update-expired-track-audio-${playlistTrack.id}`,
    );
  }

  async setTrackUpdateSchedule(playlistTrack: Track) {
    let updateTime = playlistTrack.playUriExpire;
    // update 시간은 항상 만료 시간 3분 전 으로
    updateTime.setMinutes(updateTime.getMinutes() - 3);
    await this.scheduleService.addDateTimeJob(
      updateTime,
      `update-expired-track-audio-${playlistTrack.id}`,
      async () => {
        try {
          await this.updateTrack(playlistTrack.id);
        } catch (e) {}
      },
    );
  }

  async updateTrack(trackId: number) {
    const playlistTrack = await this.trackRepository.findOne({
      where: {
        id: trackId,
      },
    });
    if (!playlistTrack) {
      throw new NotFoundException();
    }
    this.unSetTrackUpdateSchedule(playlistTrack);
    const youtubeTrack = await this.youtubeService.getDetailedYoutubeTrack(
      playlistTrack.code,
    );
    if (!youtubeTrack) {
      await this.unSaveTrack({
        code: playlistTrack.code,
        playlistId: playlistTrack.playlist.id,
      });
      throw new NotFoundException('유튜브에서 영상이 삭제된것으로 보여집니다.');
    }
    const refreshedYoutubeTrackAudio = await this.audioService.saveCloudAudio(
      youtubeTrack.playUri,
      youtubeTrack.duration_ms,
    );
    await this.audioService.removeAudio(playlistTrack.audio.id);
    await this.trackRepository.update(
      {
        id: playlistTrack.id,
      },
      {
        audio: refreshedYoutubeTrackAudio,
        playUriExpire: youtubeTrack.playUriExpire,
      },
    );
    const updatedPlaylistTrack = await this.trackRepository.findOne({
      where: {
        id: playlistTrack.id,
      },
    });
    await this.playlistService.updatePlaylistMetaData(
      updatedPlaylistTrack.playlist.id,
    );
    await this.setTrackUpdateSchedule(updatedPlaylistTrack);
    return updatedPlaylistTrack;
  }

  async changeTrackIndex(
    playlistId: number,
    fromIndex: number,
    toIndex: number,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: {
        id: playlistId,
      },
    });
    if (!playlist) {
      throw new NotFoundException();
    }
    let playlistTrack = await this.trackRepository.findOne({
      where: {
        order: fromIndex,
        playlist: {
          id: playlistId,
        },
      },
    });
    if (fromIndex > toIndex) {
      await this.trackRepository.update(
        {
          order: Between(toIndex, fromIndex - 1),
          playlist: {
            id: playlistId,
          },
        },
        { order: () => '`order` + 1' },
      );
    }
    if (fromIndex < toIndex) {
      await this.trackRepository.update(
        {
          order: Between(fromIndex + 1, toIndex),
          playlist: {
            id: playlistId,
          },
        },
        { order: () => '`order` - 1' },
      );
    }

    await this.trackRepository.update(
      {
        id: playlistTrack.id,
      },
      {
        order: toIndex,
      },
    );
  }

  async unSaveTrack(trackSaveDto: TrackSaveDto) {
    let playlistTrack: Track = await this.trackRepository.findOne({
      where: {
        playlist: {
          id: trackSaveDto.playlistId,
        },
        code: trackSaveDto.code,
      },
    });
    if (!playlistTrack) {
      throw new NotFoundException();
    }
    const lastTrack = await this.trackRepository.findOne({
      where: {
        playlist: {
          id: playlistTrack.playlist.id,
        },
      },
      order: {
        order: 'DESC',
      },
    });
    await this.changeTrackIndex(
      playlistTrack.playlist.id,
      playlistTrack.order,
      lastTrack.order,
    );
    await this.trackRepository.remove(playlistTrack);
    await this.playlistService.updatePlaylistMetaData(
      playlistTrack.playlist.id,
    );
    this.unSetTrackUpdateSchedule(playlistTrack);
  }
}
