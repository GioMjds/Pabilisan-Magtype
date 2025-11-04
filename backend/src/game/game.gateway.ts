import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Player, GameRoom } from '../types/GameGateway.types';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  },
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const roomId = this.playerRooms.get(client.id);
    if (roomId) {
      this.handlePlayerLeave(client, roomId);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string },
  ) {
    const roomId = this.generateRoomId();
    
    const player: Player = {
      id: client.id,
      username: data.username,
      progress: 0,
      wpm: 0,
      isReady: false,
    };
  
    const room: GameRoom = {
      id: roomId,
      players: new Map([[client.id, player]]),
      text: this.generateGameText(),
      startTime: null,
      isActive: false,
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(client.id, roomId);

    client.join(roomId);

    const serializedRoom = this.serializeRoom(room);

    // Emit room created event to all clients in the room
    this.server.to(roomId).emit('roomCreated', {
      room: serializedRoom,
    });

    return {
      roomId,
      room: serializedRoom,
    };
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; username: string },
  ) {
    console.log(`Player ${data.username} attempting to join room ${data.roomId}`);
    
    const room = this.rooms.get(data.roomId);

    if (!room) {
      console.log(`Room ${data.roomId} not found`);
      return { error: 'Room not found' };
    }

    if (room.isActive) {
      return { error: 'Game already started' };
    }

    if (room.players.size >= 4) {
      return { error: 'Room is full' };
    }

    const player: Player = {
      id: client.id,
      username: data.username,
      progress: 0,
      wpm: 0,
      isReady: false,
    };

    room.players.set(client.id, player);
    this.playerRooms.set(client.id, data.roomId);

    client.join(data.roomId);

    const serializedRoom = this.serializeRoom(room);

    // Emit to all players in the room (including the new player)
    this.server.to(data.roomId).emit('playerJoined', {
      player: this.serializePlayer(player),
      room: serializedRoom,
    });

    return {
      room: serializedRoom,
    };
  }

  @SubscribeMessage('playerReady')
  handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isReady: boolean },
  ) {
    const roomId = this.playerRooms.get(client.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(client.id);
    if (!player) return;

    player.isReady = data.isReady;

    this.server.to(roomId).emit('playerStatusChanged', {
      playerId: client.id,
      isReady: data.isReady,
      room: this.serializeRoom(room),
    });

    const allReady = Array.from(room.players.values()).every(p => p.isReady);
    if (allReady && room.players.size > 1) {
      this.startGame(roomId);
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const roomId = this.playerRooms.get(client.id);
    if (roomId) {
      console.log(`Player ${client.id} leaving room ${roomId}`);
      this.handlePlayerLeave(client, roomId);
    }
  }

  @SubscribeMessage('updateProgress')
  handleUpdateProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { progress: number; currentText: string },
  ) {
    const roomId = this.playerRooms.get(client.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || !room.isActive) return;

    const player = room.players.get(client.id);
    if (!player) return;

    player.progress = data.progress;

    if (room.startTime) {
      const timeElapsed = (Date.now() - room.startTime) / 60000; // in minutes
      const wordsTyped = data.currentText.trim().split(/\s+/).length;
      player.wpm = Math.round(wordsTyped / timeElapsed);
    }

    this.server.to(roomId).emit('progressUpdated', {
      playerId: client.id,
      progress: player.progress,
      wpm: player.wpm,
    });

    if (data.progress >= 100) {
      this.handlePlayerFinished(roomId, client.id);
    }
  }

  private startGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.isActive = true;
    room.startTime = Date.now();

    // Reset all players
    room.players.forEach(player => {
      player.progress = 0;
      player.wpm = 0;
    });

    this.server.to(roomId).emit('gameStarted', {
      startTime: room.startTime,
      text: room.text,
    });
  }

  private handlePlayerFinished(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    const finishTime = Date.now();
    const timeElapsed = room.startTime
      ? (finishTime - room.startTime) / 1000
      : 0;

    this.server.to(roomId).emit('playerFinished', {
      playerId,
      username: player.username,
      wpm: player.wpm,
      time: timeElapsed,
    });

    // Check if all players finished
    const allFinished = Array.from(room.players.values()).every(
      (p) => p.progress >= 100,
    );

    if (allFinished) {
      this.endGame(roomId);
    }
  }

  private endGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.isActive = false;

    const results = Array.from(room.players.values())
      .map((player) => ({
        playerId: player.id,
        username: player.username,
        wpm: player.wpm,
      }))
      .sort((a, b) => b.wpm - a.wpm);

    this.server.to(roomId).emit('gameEnded', {
      results,
    });

    // Reset room for next game
    room.players.forEach((player) => {
      player.progress = 0;
      player.wpm = 0;
      player.isReady = false;
    });
    room.text = this.generateGameText();
    room.startTime = null;
  }

  private handlePlayerLeave(client: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    console.log(`Player ${client.id} leaving room ${roomId}`);
    
    room.players.delete(client.id);
    this.playerRooms.delete(client.id);
    
    // Make client leave the socket.io room
    client.leave(roomId);

    if (room.players.size === 0) {
      console.log(`Room ${roomId} is empty, deleting...`);
      this.rooms.delete(roomId);
    } else {
      console.log(`Emitting playerLeft to remaining ${room.players.size} players`);
      this.server.to(roomId).emit('playerLeft', {
        playerId: client.id,
        room: this.serializeRoom(room),
      });

      // End game if active and not enough players
      if (room.isActive && room.players.size < 2) {
        this.endGame(roomId);
      }
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateGameText(): string {
    const texts = [
      'The quick brown fox jumps over the lazy dog near the riverbank where the sun sets beautifully.',
      'Programming is the art of telling another human what one wants the computer to do with precision.',
      'In the digital age, typing speed and accuracy have become essential skills for productivity.',
      'WebSocket technology enables real-time bidirectional communication between client and server.',
      'Practice makes perfect, and consistency is the key to improving your typing speed over time.',
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  }

  private serializeRoom(room: GameRoom) {
    return {
      id: room.id,
      players: Array.from(room.players.values()).map((p) =>
        this.serializePlayer(p),
      ),
      text: room.text,
      isActive: room.isActive,
    };
  }

  private serializePlayer(player: Player) {
    return {
      id: player.id,
      username: player.username,
      progress: player.progress,
      wpm: player.wpm,
      isReady: player.isReady,
    };
  }
}
