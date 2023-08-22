import {
  OnGatewayConnection,
  SubscribeMessage,
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
import { SpeakerService } from './speaker.service';

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
  namespace: 'speaker',
  cors: 'true',
})
@UsePipes(ValidationPipe)
@UseFilters(BadRequestFilter, WebSocketFilter)
export class SpeakerGateway implements OnGatewayConnection {
  @Inject(forwardRef(() => SpeakerService))
  private speakerService: SpeakerService;

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    // client.emit('volume', this.speakerService.listenVolume());
  }

  //getVolume
  @SubscribeMessage('volume')
  listenVolume(client: Socket) {
    client.emit('volume', this.speakerService.listenVolume());
  }
}
