import {
  Inject,
  Injectable,
  UsePipes,
  ValidationPipe,
  forwardRef,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PlayScheduleService } from './play-schedule.service';
import { Socket, Server } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: 'play-schedule',
  cors: 'true',
})
@UsePipes(ValidationPipe)
export class PlayScheduleGateway implements OnGatewayConnection {
  constructor() {}

  @Inject(forwardRef(() => PlayScheduleService))
  private playScheduleService: PlayScheduleService;

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.playScheduleService.sendNowPlaySchedule(client);
  }
}
