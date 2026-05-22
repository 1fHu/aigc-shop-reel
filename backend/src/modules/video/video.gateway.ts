import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/video', cors: true })
export class VideoGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoGateway.name);

  @SubscribeMessage('video-progress')
  handleProgress(client: Socket, payload: any): void {
    // TODO: implement video generation progress updates
    this.logger.log(`Video progress update from client ${client.id}`);
  }
}
