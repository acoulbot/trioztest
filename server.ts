import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import { IncomingMessage } from "http";
import { connectRedis } from "./src/lib/redis";
import { createReadStream, existsSync, statSync } from "fs";
import { join, extname } from "path";

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

const MIME_TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".enc": "application/octet-stream",
};

function serveUploadedFile(urlPath: string, res: import("http").ServerResponse): boolean {
  if (!urlPath.startsWith("/uploads/")) return false;
  const safePath = urlPath.replace(/\.\.+/g, "").replace(/\/\//g, "/");
  const filePath = join(process.cwd(), "public", safePath);
  if (!existsSync(filePath)) return false;
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const url = req.url || "";
      const pathOnly = url.split("?")[0];
      if (serveUploadedFile(pathOnly, res)) return;
      await handle(req, res);
    } catch (err) {
      console.error("[HTTP] Request handler error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
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
  // Set BEFORE any request can be processed (prepare() is already done)
  (globalThis as Record<string, unknown>).__socketio = io;
  (globalThis as Record<string, unknown>).__socketioReady = true;

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

    // ── DM room ───────────────────────────────────────────────────────
    socket.join(`dm-${authData.userId}`);

    // DM typing indicators — relay to the other participant via their dm room
    socket.on("dm-typing", ({ convId }: { convId: string }) => {
      // Emit to all sockets of the user except the sender
      // convId used to look up the other participant would require a DB call;
      // instead we broadcast to the dm-* room of the other user.
      // The server stores convId→participantIds mapping would be ideal; for now
      // we relay to the conversation room so the other participant sees it.
      socket.to(`dm-conv-${convId}`).emit("dm-typing", {
        userId: authData.userId,
        userName: authData.userName,
      });
    });

    socket.on("dm-stop-typing", ({ convId }: { convId: string }) => {
      socket.to(`dm-conv-${convId}`).emit("dm-stop-typing", {
        userId: authData.userId,
      });
    });

    // Join a DM conversation room so typing events are scoped to participants
    socket.on("join-dm-conv", ({ convId }: { convId: string }) => {
      socket.join(`dm-conv-${convId}`);
    });

    socket.on("leave-dm-conv", ({ convId }: { convId: string }) => {
      socket.leave(`dm-conv-${convId}`);
    });

    // ── Voice channels ──────────────────────────────────────────────
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

    // ── DM room ───────────────────────────────────────────────────────
    socket.join(`dm-${authData.userId}`);
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

      // Broadcast updated user list for sidebar previews
      broadcastVoiceChannelUsers(channelId);

      console.log(`[Voice] ${authData.userName} joined channel ${channelId}. Users: ${room.size}`);
    });

    socket.on("leave-voice", ({ channelId }: { channelId: string }) => {
      leaveVoiceChannel(socket, channelId);
    });

    // Query who is in a voice channel (without joining)
    socket.on("get-voice-channel-users", ({ channelId }: { channelId: string }) => {
      const room = voiceRooms.get(channelId);
      const users = room ? Array.from(room.values()) : [];
      socket.emit("voice-channel-users", { channelId, users });
    });

    // Query all voice channels at once
    socket.on("get-all-voice-users", () => {
      const result: Record<string, VoiceUser[]> = {};
      voiceRooms.forEach((room, chId) => {
        result[chId] = Array.from(room.values());
      });
      socket.emit("all-voice-users", result);
    });

    socket.on("voice-offer", ({ to, offer }: { to: string; offer: unknown }) => {
      io.to(to).emit("voice-offer", { from: socket.id, offer });
    });

    socket.on("voice-answer", ({ to, answer }: { to: string; answer: unknown }) => {
      io.to(to).emit("voice-answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }: { to: string; candidate: unknown }) => {
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
      const channelsToLeave = Array.from(voiceRooms.entries())
        .filter(([, room]) => room.has(socket.id))
        .map(([channelId]) => channelId);
      for (const channelId of channelsToLeave) {
        leaveVoiceChannel(socket, channelId);
      }
    });

    function broadcastVoiceChannelUsers(channelId: string) {
      const room = voiceRooms.get(channelId);
      const users = room ? Array.from(room.values()) : [];
      io.emit("voice-channel-users", { channelId, users });
    }

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

        // Broadcast updated user list for sidebar previews
        broadcastVoiceChannelUsers(channelId);

        if (user) {
          console.log(`[Voice] ${user.userName} left channel ${channelId}. Users: ${room.size}`);
        }
      }
    }
  });

  // Connect Redis for rate limiting (fallback to in-memory if unavailable)
  connectRedis().then((ok) => {
    if (ok) console.log("[Redis] Connected successfully");
  });

  // Scheduled file cleanup: every 6 hours, remove large files older than 14 days
  // Skips NEWS channels and admin content
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  setInterval(async () => {
    try {
      const { cleanupExpiredFiles } = await import("./src/lib/fileCleanup");
      const result = await cleanupExpiredFiles();
      if (result.filesDeleted > 0 || result.dmFilesDeleted > 0) {
        console.log("[Cleanup] Auto:", result);
      }
    } catch (err) {
      console.error("[Cleanup] Scheduled error:", err);
    }
  }, CLEANUP_INTERVAL);

  // Run initial cleanup 60 seconds after startup
  setTimeout(async () => {
    try {
      const { cleanupExpiredFiles } = await import("./src/lib/fileCleanup");
      const result = await cleanupExpiredFiles();
      console.log("[Cleanup] Initial run:", result);
    } catch (err) {
      console.error("[Cleanup] Initial error:", err);
    }
  }, 60_000);

  // Scheduled message sender: every 30 seconds
  setInterval(async () => {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const p = new PrismaClient();
      const due = await p.scheduledMessage.findMany({
        where: { sent: false, scheduledAt: { lte: new Date() } },
        take: 20,
      });
      for (const sm of due) {
        await p.message.create({
          data: { content: sm.content, channelId: sm.channelId, userId: sm.userId },
        });
        await p.scheduledMessage.update({ where: { id: sm.id }, data: { sent: true } });
        io.to(`channel:${sm.channelId}`).emit("new-message", {
          id: sm.id, content: sm.content, channelId: sm.channelId,
          createdAt: new Date().toISOString(),
          user: await p.user.findUnique({ where: { id: sm.userId }, select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } }),
          reactions: [], reads: [], replyTo: null, _count: { threadReplies: 0 },
        });
      }
      await p.$disconnect();
    } catch (err) {
      console.error("[Scheduled] Error:", err);
    }
  }, 30_000);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
