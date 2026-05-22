import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In-memory room state (for MVP; production would use Redis)
const rooms = new Map<string, Map<string, { name: string; peerId: string; joinedAt: number }>>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const room = rooms.get(channelId);
  const participants = room ? Array.from(room.values()) : [];

  return NextResponse.json({ channelId, participants });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId, action, peerId } = await req.json();

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  if (action === "join") {
    if (!rooms.has(channelId)) {
      rooms.set(channelId, new Map());
    }
    rooms.get(channelId)!.set(session.user.id, {
      name: session.user.name,
      peerId: peerId || session.user.id,
      joinedAt: Date.now(),
    });
  } else if (action === "leave") {
    rooms.get(channelId)?.delete(session.user.id);
    if (rooms.get(channelId)?.size === 0) {
      rooms.delete(channelId);
    }
  }

  const room = rooms.get(channelId);
  const participants = room ? Array.from(room.values()) : [];

  return NextResponse.json({ channelId, participants });
}
