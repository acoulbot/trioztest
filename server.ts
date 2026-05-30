import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface VoiceUser {
  socketId: string;
  userId: string;
  userName: string;
  muted: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceUser>>();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socketio",
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("join-voice", ({ channelId, userId, userName }: { channelId: string; userId: string; userName: string }) => {
      const user: VoiceUser = { socketId: socket.id, userId, userName, muted: false };

      if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Map());
      }
      const room = voiceRooms.get(channelId)!;

      const existingUsers = Array.from(room.values());
      socket.emit("voice-users", existingUsers);

      room.set(socket.id, user);
      socket.join(`voice-${channelId}`);

      socket.to(`voice-${channelId}`).emit("user-joined", user);

      console.log(`[Voice] ${userName} joined channel ${channelId}. Users: ${room.size}`);
    });

    socket.on("leave-voice", ({ channelId }: { channelId: string }) => {
      leaveVoiceChannel(socket, channelId);
    });

    socket.on("voice-offer", ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      io.to(to).emit("voice-offer", { from: socket.id, offer });
    });

    socket.on("voice-answer", ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      io.to(to).emit("voice-answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("toggle-mute", ({ channelId, muted }: { channelId: string; muted: boolean }) => {
      const room = voiceRooms.get(channelId);
      if (room) {
        const user = room.get(socket.id);
        if (user) {
          user.muted = muted;
          socket.to(`voice-${channelId}`).emit("user-muted", { socketId: socket.id, muted });
        }
      }
    });

    socket.on("speaking", ({ channelId, speaking }: { channelId: string; speaking: boolean }) => {
      socket.to(`voice-${channelId}`).emit("user-speaking", { socketId: socket.id, speaking });
    });

    socket.on("screen-share-started", ({ channelId }: { channelId: string }) => {
      socket.to(`voice-${channelId}`).emit("screen-share-started", { socketId: socket.id });
    });

    socket.on("screen-share-stopped", ({ channelId }: { channelId: string }) => {
      socket.to(`voice-${channelId}`).emit("screen-share-stopped", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      voiceRooms.forEach((room, channelId) => {
        if (room.has(socket.id)) {
          leaveVoiceChannel(socket, channelId);
        }
      });
    });

    function leaveVoiceChannel(sock: typeof socket, channelId: string) {
      const room = voiceRooms.get(channelId);
      if (room) {
        const user = room.get(sock.id);
        room.delete(sock.id);
        sock.leave(`voice-${channelId}`);
        sock.to(`voice-${channelId}`).emit("user-left", { socketId: sock.id });

        if (room.size === 0) {
          voiceRooms.delete(channelId);
        }

        if (user) {
          console.log(`[Voice] ${user.userName} left channel ${channelId}. Users: ${room.size}`);
        }
      }
    }
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
