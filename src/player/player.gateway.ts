import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Inject,
  Injectable,
  UseFilters,
  UsePipes,
  ValidationPipe,
  WsExceptionFilter,
  forwardRef,
} from '@nestjs/common';
import { PlayerService } from './player.service';

@Catch(BadRequestException)
export class BadRequestFilter implements WsExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient();
    client.emit('error', exception.getResponse());
  }
}

@Catch(WsException)
export class WebSocketFilter implements WsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient();
    client.emit('error', exception);
  }
}

@Injectable()
@WebSocketGateway({
  namespace: 'player',
  cors: 'true',
})
@UsePipes(ValidationPipe)
@UseFilters(BadRequestFilter, WebSocketFilter)
export class PlayerGateway implements OnGatewayConnection {
  constructor() {}
  @Inject(forwardRef(() => PlayerService))
  private playerService: PlayerService;

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    this.playerService.sendVolume(client);
    this.playerService.sendNowPlayingAudio(client);
  }
}
