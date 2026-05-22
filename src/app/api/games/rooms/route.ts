import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const rooms = await prisma.gameRoom.findMany({
    where: {
      OR: [
        { hostId: userId },
        { players: { some: { userId } } },
        { invites: { some: { inviteeId: userId, status: "PENDING" } } },
      ],
    },
    include: {
      host: { select: { id: true, name: true, username: true, avatar: true } },
      players: {
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true } },
        },
      },
      _count: { select: { players: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { name, maxPlayers } = await req.json();

  const inviteCode = uuidv4().slice(0, 8);

  const room = await prisma.gameRoom.create({
    data: {
      name: name || "Партия в Вельд'Эран",
      hostId: userId,
      maxPlayers: Math.min(Math.max(maxPlayers || 2, 2), 10),
      inviteCode,
      players: {
        create: {
          userId,
          turnOrder: 0,
        },
      },
    },
    include: {
      host: { select: { id: true, name: true, username: true, avatar: true } },
      players: {
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true } },
        },
      },
    },
  });

  return NextResponse.json(room, { status: 201 });
}
