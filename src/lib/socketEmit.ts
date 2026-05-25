import type { Server as SocketIOServer } from "socket.io";

export function getIO(): SocketIOServer | null {
  return ((globalThis as Record<string, unknown>).__socketio as SocketIOServer) ?? null;
}

export function emitToChannel(channelId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`channel-${channelId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`dm-${userId}`).emit(event, data);
  }
}
