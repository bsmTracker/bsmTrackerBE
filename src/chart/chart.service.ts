import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChartTrack } from './entity/chart-track.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { YoutubeService } from 'src/youtube/youtube.service';
import { Server, Socket } from 'socket.io';
import { Like } from './entity/like.entity';
import { ChartGateway } from './chart.gateway';
import { PreviewYoutubeTrack } from 'src/youtube/type/youtube.type';

@Injectable()
export class ChartService {
  constructor(
    @InjectRepository(ChartTrack)
    private chartTrackRepository: Repository<ChartTrack>,
    @InjectRepository(Like) private likeRepository: Repository<Like>,
    private youtubeService: YoutubeService,
  ) {}

  @Inject(forwardRef(() => ChartGateway))
  private chartGateway: ChartGateway;

  public async recommendTrack(code: string, user: User) {
    const recommederBeforeRecommend = await this.chartTrackRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });
    if (recommederBeforeRecommend) {
      throw new HttpException(
        '한계정당 하나만 추천가능합니다',
        HttpStatus.FOUND,
      );
    }
    const sameTrack = await this.chartTrackRepository.findOne({
      where: {
        code,
      },
    });
    if (sameTrack) {
      throw new HttpException('이미 같은 추천곡이 있습니다', HttpStatus.FOUND);
    }
    const youtubeTrack =
      await this.youtubeService.getDetailedYoutubeTrack(code);
    const chartTrack = new ChartTrack();
    chartTrack.image = youtubeTrack.image;
    chartTrack.duration_ms = youtubeTrack.duration_ms;
    chartTrack.name = youtubeTrack.name;
    chartTrack.code = code;
    chartTrack.user = user;
    await chartTrack.save();
    //소켓 업데이트
    await this.sendTrackChart();
  }

  public async cancelRecommendTrack(code: string, user: User) {
    const recommendedTrack = await this.chartTrackRepository.findOne({
      where: {
        code,
        user: {
          id: user.id,
        },
      },
    });
    if (!recommendedTrack) {
      throw new HttpException('추천된 곡이 아닙니다', HttpStatus.NOT_FOUND);
    }

    await this.chartTrackRepository.remove(recommendedTrack);
    //소켓 업데이트
    await this.sendTrackChart();
  }

  public async toggleLike(code: string, user: User) {
    const recommendedTrack = await this.chartTrackRepository.findOne({
      where: {
        code,
      },
    });
    if (!recommendedTrack) {
      throw new HttpException(
        '추천된 트랙이 아니거나 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    let myLike = await this.likeRepository.findOne({
      where: {
        chartTrackId: recommendedTrack.id,
        likerId: user.id,
      },
    });
    let likeCount = recommendedTrack.likeCount;
    if (myLike) {
      await this.likeRepository.remove(myLike);
      likeCount--;
    } else {
      myLike = new Like();
      myLike.chartTrackId = recommendedTrack.id;
      myLike.likerId = user.id;
      await myLike.save();
      likeCount++;
    }
    await this.chartTrackRepository.update(
      {
        id: recommendedTrack.id,
      },
      {
        likeCount,
      },
    );
    await this.sendTrackChart();
    //소켓 업데이트
  }

  public async sendTrackChart(
    socket: Socket | Server = this.chartGateway.server,
  ) {
    const chartTrack = await this.chartTrackRepository.find({
      order: {
        likeCount: 'DESC',
        createdAt: 'ASC',
      },
      relations: {
        user: true,
      },
    });
    socket.emit('chart', chartTrack);
  }

  async searchTrack(q: string): Promise<PreviewYoutubeTrack[]> {
    return await this.youtubeService.searchTracks(q);
  }

  async getMyRecommend(user: User) {
    if (!user) {
      return [];
    }
    return await this.chartTrackRepository.find({
      select: ['code', 'createdAt', 'duration_ms', 'name', 'image'],
      where: {
        userId: user.id,
      },
    });
  }

  async getMyLikes(user: User) {
    if (!user) {
      return [];
    }
    return await this.chartTrackRepository.find({
      select: ['code', 'createdAt', 'duration_ms', 'name', 'image'],
      where: {
        likes: {
          likerId: user.id,
        },
      },
    });
  }
}
