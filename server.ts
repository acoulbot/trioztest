import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import { IncomingMessage } from "http";

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

interface AuthenticatedSocket {
  userId: string;
  userName: string;
}

const voiceRooms = new Map<string, Map<string, VoiceUser>>();
const authenticatedSockets = new Map<string, AuthenticatedSocket>();
const userSockets = new Map<string, Set<string>>();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [`http://localhost:${port}`, `http://0.0.0.0:${port}`];

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socketio",
  });

  // Export io globally so API routes can emit events
  (globalThis as Record<string, unknown>).__socketio = io;

  io.use(async (socket, next) => {
    try {
      const req = socket.request as IncomingMessage & { cookies?: Record<string, string> };
      const cookieHeader = req.headers.cookie || "";
      const cookies: Record<string, string> = {};
      cookieHeader.split(";").forEach((c) => {
        const [key, ...val] = c.split("=");
        if (key) cookies[key.trim()] = val.join("=").trim();
      });
      req.cookies = cookies;

      const token = await getToken({ req: req as Parameters<typeof getToken>[0]["req"], secret: process.env.NEXTAUTH_SECRET });
      if (!token || !token.id) {
        return next(new Error("Authentication required"));
      }

      authenticatedSockets.set(socket.id, {
        userId: token.id as string,
        userName: (token.name || token.username || "Unknown") as string,
      });

      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const authData = authenticatedSockets.get(socket.id);
    if (!authData) {
      socket.disconnect(true);
      return;
    }
    console.log(`[Socket] Connected: ${socket.id} (user: ${authData.userId})`);

    // Track user -> sockets mapping for targeted notifications
    if (!userSockets.has(authData.userId)) {
      userSockets.set(authData.userId, new Set());
    }
    userSockets.get(authData.userId)!.add(socket.id);

    // ── Text channel rooms ──────────────────────────────────────────
    socket.on("join-channel", ({ channelId }: { channelId: string }) => {
      socket.join(`channel-${channelId}`);
    });

    socket.on("leave-channel", ({ channelId }: { channelId: string }) => {
      socket.leave(`channel-${channelId}`);
    });

    socket.on("typing", ({ channelId }: { channelId: string }) => {
      socket.to(`channel-${channelId}`).emit("user-typing", {
        userId: authData.userId,
        userName: authData.userName,
        channelId,
      });
    });

    socket.on("stop-typing", ({ channelId }: { channelId: string }) => {
      socket.to(`channel-${channelId}`).emit("user-stop-typing", {
        userId: authData.userId,
        channelId,
      });
    });

    // ── Voice channels ──────────────────────────────────────────────
    socket.on("join-voice", ({ channelId }: { channelId: string }) => {
      const user: VoiceUser = { socketId: socket.id, userId: authData.userId, userName: authData.userName, muted: false };

      if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Map());
      }
      const room = voiceRooms.get(channelId)!;

      const existingUsers = Array.from(room.values());
      socket.emit("voice-users", existingUsers);

      room.set(socket.id, user);
      socket.join(`voice-${channelId}`);

      socket.to(`voice-${channelId}`).emit("user-joined", user);

      console.log(`[Voice] ${authData.userName} joined channel ${channelId}. Users: ${room.size}`);
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

    // ── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Clean up user socket tracking
      if (authData) {
        const sockets = userSockets.get(authData.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) userSockets.delete(authData.userId);
        }
      }

      authenticatedSockets.delete(socket.id);
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
