import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Injectable,
  UseFilters,
  UsePipes,
  ValidationPipe,
  WsExceptionFilter,
} from '@nestjs/common';

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

  @WebSocketServer()
  server: Server;

  async handleConnection() {
    console.log('asdf');
  }
}
