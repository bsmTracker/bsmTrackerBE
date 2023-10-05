import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ChartService } from './chart.service';
import { User } from 'src/user/entity/user.entity';
import { GetUser } from 'src/auth/decorator/userinfo.decorator';
import { PassNotLoggedIn } from 'src/auth/decorator/pass_not_logged_in.decorator';

@Controller('chart')
@UseGuards(AuthGuard)
export class ChartController {
  constructor(private chartService: ChartService) {}

  //음악 검색
  @Get('/search')
  // @PassNotLoggedIn()
  async search(@Query('keyword') keyword: string) {
    // 음악을 추천, 즉 차트에 추가한다.
    console.log(keyword);
    return await this.chartService.searchTrack(keyword);
  }

  //음악 추천
  @Post('/recommend')
  async recommend(@Query('code') code: string, @GetUser() user: User) {
    // 음악을 추천, 즉 차트에 추가한다.
    console.log(code);
    return await this.chartService.recommendTrack(code, user);
  }

  //추천한 음악에 대하여 추천 취소
  @Post('/cancelRecommend')
  async cancelRecommend(@Query('code') code: string, @GetUser() user: User) {
    // 음악을 추천취소, 즉 차트에서 제거한다.
    return await this.chartService.cancelRecommendTrack(code, user);
  }

  //추천된 음악에 대해서 투표
  @Post('/toggleLike')
  async toggleLike(@Query('code') code: string, @GetUser() user: User) {
    //음악을 투표 토글
    return await this.chartService.toggleLike(code, user);
  }

  @Get('/getMyRecommends')
  @PassNotLoggedIn()
  async getMyRecommend(@GetUser() user: User) {
    console.log(user);
    return await this.chartService.getMyRecommend(user);
  }

  @Get('/getMyLikes')
  @PassNotLoggedIn()
  async getMyLikes(@GetUser() user: User) {
    return await this.chartService.getMyLikes(user);
  }

  // 아키택처
  // 소켓으로 차트들을 보내준다 (트랙, 투표수, 제목, 재생시간, 순위, 추천인 등)
  // 투표여부에 대한 개인적인 데이터들은 따로 API를 분리해준다.
}
