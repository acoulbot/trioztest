import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkBan } from "@/lib/banCheck";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const conversation = await prisma.directConversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const messages = await prisma.directMessage.findMany({
    where: { conversationId: id },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: hasMore ? messages[0]?.id : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { id } = await params;
  const userId = session.user.id;

  const conversation = await prisma.directConversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content, attachments } = await req.json();
  if ((!content || !content.trim()) && !attachments) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }
  if (content && content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const sanitized = content ? sanitizeText(content) : "";
  if (!sanitized && !attachments) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const message = await prisma.directMessage.create({
    data: {
      content: sanitized,
      conversationId: id,
      userId,
      attachments: attachments ? JSON.stringify(attachments) : null,
    },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
    },
  });

  await prisma.directConversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json(message);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { messageId, content } = await req.json();
  if (!messageId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (message.conversationId !== id) return NextResponse.json({ error: "Mismatch" }, { status: 400 });

  const updated = await prisma.directMessage.update({
    where: { id: messageId },
    data: { content: sanitizeText(content), edited: true, editedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (message.conversationId !== id) return NextResponse.json({ error: "Mismatch" }, { status: 400 });

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { deleted: true, content: "" },
  });

  return NextResponse.json({ ok: true });
}
