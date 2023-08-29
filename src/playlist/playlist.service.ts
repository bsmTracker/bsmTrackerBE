import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Playlist from './entity/playlist.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerService } from 'src/player/player.service';
import Track from 'src/track/entity/Track.entity';

@Injectable()
export class PlaylistService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>, // private trackService: TrackService,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
  ) {}

  async getPlaylists(): Promise<Playlist[]> {
    const playlistsInfo: Playlist[] = await this.playlistRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
    return playlistsInfo;
  }

  async getPlaylistDetail(playlistId: number): Promise<Playlist> {
    const playlistInfo = await this.playlistRepository.findOne({
      where: {
        id: playlistId,
      },
      order: {
        tracks: {
          order: 'ASC',
        },
      },
      relations: {
        tracks: true,
      },
    });
    return playlistInfo;
  }

  async createPlaylist(name: string): Promise<Playlist> {
    return await this.playlistRepository
      .create({
        name,
      })
      .save();
  }

  async deletePlaylist(playlistId: number): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: {
        id: playlistId,
      },
      relations: {
        tracks: true,
      },
    });
    if (!playlist) {
      throw new HttpException(
        '플레이리스트가 존재하지 않음',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.trackRepository.remove(playlist.tracks);
    await this.playlistRepository.remove(playlist);
  }

  async updatePlaylistMetaData(playlistId: number) {
    if (!playlistId) return;
    const { trackCount, total_duration_ms } = await this.trackRepository
      .createQueryBuilder('track')
      .where('playlistId = :playlistId', { playlistId })
      .select('COUNT(track.id)', 'trackCount')
      .addSelect('SUM(track.duration_ms)', 'total_duration_ms')
      .getRawOne();
    return await this.playlistRepository.update(
      {
        id: playlistId,
      },
      {
        trackCount: Number(trackCount),
        duration_s: Math.round(Number(total_duration_ms) / 1000),
      },
    );
  }
}
