import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // ⚠️ Allow all origins for now; restrict in production
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map<socket.id, userId>
  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`✅ New client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      console.log(`❌ User ${userId} disconnected`);
      this.connectedUsers.delete(client.id);
    }
  }

  // When a user connects, they send their userId
  @SubscribeMessage('registerUser')
  registerUser(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    this.connectedUsers.set(client.id, data.userId);
    client.join(data.userId); // Join a room with their userId
    console.log(`👤 User ${data.userId} joined their personal room`);
  }

  // Broadcast from one user to another (peer-to-peer)
  sendPrivateEvent(receiverId: string, event: string, payload: any) {
    this.server.to(receiverId).emit(event, payload);
  }

  // Example: handle message from frontend
  @SubscribeMessage('messageToServer')
  handleMessage(@MessageBody() data: any) {
    console.log('📨 Received message:', data);
    this.server.emit('messageToClients', data);
  }
}
