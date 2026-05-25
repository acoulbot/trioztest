import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { emitToChannel } from "@/lib/socketEmit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await req.json();
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, channelId: true, pinned: true, channel: { select: { groupId: true } } },
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check admin/owner
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: message.channel.groupId } },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only admins can pin messages" }, { status: 403 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      pinned: !message.pinned,
      pinnedBy: !message.pinned ? session.user.id : null,
      pinnedAt: !message.pinned ? new Date() : null,
    },
  });

  emitToChannel(message.channelId, "message-pinned", {
    messageId,
    pinned: updated.pinned,
    pinnedBy: session.user.id,
  });

  return NextResponse.json({ pinned: updated.pinned });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const pinnedMessages = await prisma.message.findMany({
    where: { channelId, pinned: true, deleted: false },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true } },
    },
    orderBy: { pinnedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(pinnedMessages);
}
