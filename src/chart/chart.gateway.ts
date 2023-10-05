import { Inject, ParseIntPipe, UseGuards, forwardRef } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChartService } from './chart.service';

@WebSocketGateway({
  namespace: 'chart',
  cors: 'true',
})
export class ChartGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  @Inject(forwardRef(() => ChartService))
  private chartService: ChartService;

  //   constructor(private authService: AuthService) {}
  async handleConnection(client: Socket) {
    await this.chartService.sendTrackChart(client);
  }

  handleDisconnect(client: Socket) {
    // 연결이 종료될 때 호출됩니다.
  }
}
