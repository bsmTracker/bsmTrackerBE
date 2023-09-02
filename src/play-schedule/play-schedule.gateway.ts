import {
  Inject,
  Injectable,
  UsePipes,
  ValidationPipe,
  forwardRef,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'http';
import { PlayScheduleService } from './play-schedule.service';

@Injectable()
@WebSocketGateway({
  namespace: 'play-schedule',
  cors: 'true',
})
@UsePipes(ValidationPipe)
export class PlayScheduleGateway {
  constructor() {}

  @Inject(forwardRef(() => PlayScheduleService))
  private playScheduleService: PlayScheduleService;

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('now-play-schedule')
  async getNowPlaySchedule() {
    this.playScheduleService.sendNowPlaySchedule();
  }
}
