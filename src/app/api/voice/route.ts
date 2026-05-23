import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// In-memory room state (for MVP; production would use Redis)
const rooms = new Map<string, Map<string, { name: string; peerId: string; joinedAt: number }>>();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  // Verify user is a member of the group that owns this channel
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { groupId: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: channel.groupId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
