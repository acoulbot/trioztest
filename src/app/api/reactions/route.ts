import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkBan } from "@/lib/banCheck";
import { emitToChannel } from "@/lib/socketEmit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (emoji.length > 10) return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });

  const message = await prisma.message.findUnique({ where: { id: messageId }, select: { channelId: true } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // Check existing reaction
  const existing = await prisma.reaction.findUnique({
    where: { userId_messageId_emoji: { userId: session.user.id, messageId, emoji } },
  });

  if (existing) {
    // Remove reaction (toggle)
    await prisma.reaction.delete({ where: { id: existing.id } });
    emitToChannel(message.channelId, "reaction-removed", { messageId, emoji, userId: session.user.id });
    return NextResponse.json({ action: "removed" });
  }

  const reaction = await prisma.reaction.create({
    data: { emoji, userId: session.user.id, messageId },
    include: { user: { select: { id: true, name: true, username: true } } },
  });

  emitToChannel(message.channelId, "reaction-added", {
    messageId,
    emoji,
    userId: session.user.id,
    userName: reaction.user.name,
  });

  return NextResponse.json({ action: "added", reaction });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  const reactions = await prisma.reaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, name: true, username: true } } },
  });

  // Group by emoji
  const grouped: Record<string, { emoji: string; count: number; users: { id: string; name: string }[]; userReacted: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], userReacted: false };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push({ id: r.user.id, name: r.user.name });
    if (r.userId === session.user.id) grouped[r.emoji].userReacted = true;
  }

  return NextResponse.json(Object.values(grouped));
}
