import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkBan } from "@/lib/banCheck";
import { sanitizeText } from "@/lib/sanitize";
import { emitToUser } from "@/lib/socketEmit";
import { createNotification } from "@/lib/createNotification";

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
  const encryptedParam = searchParams.get("encrypted"); // "true" | "false" | null (all)

  // Build where clause — filter by encrypted flag if column exists
  const encryptedFilter: { encrypted?: boolean } = {};
  if (encryptedParam === "true")  encryptedFilter.encrypted = true;
  if (encryptedParam === "false") encryptedFilter.encrypted = false;

  const messages = await prisma.directMessage.findMany({
    where: { conversationId: id, ...encryptedFilter },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
      replyTo: { select: { id: true, content: true, user: { select: { id: true, name: true } } } },
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

  const { content, attachments, replyToId, encrypted: clientEncrypted } = await req.json();
  if ((!content || !content.trim()) && !attachments) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }
  const maxLen = content && content.startsWith("e2ee:") ? 16000 : 4000;
  if (content && content.length > maxLen) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const isE2EE = content && content.startsWith("e2ee:");
  const sanitized = isE2EE ? content : (content ? sanitizeText(content) : "");
  if (!sanitized && !attachments) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const message = await prisma.directMessage.create({
    data: {
      content: sanitized,
      conversationId: id,
      userId,
      encrypted: isE2EE || clientEncrypted || false,
      attachments: attachments ? JSON.stringify(attachments) : null,
      replyToId: replyToId || null,
    },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
      replyTo: { select: { id: true, content: true, user: { select: { id: true, name: true } } } },
    },
  });

  await prisma.directConversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  const otherId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
  const dmPayload = { ...message, conversationId: id };
  emitToUser(otherId, "dm-message", dmPayload);
  emitToUser(userId, "dm-message", dmPayload);

  createNotification({
    userId: otherId,
    type: "dm",
    title: `Новое сообщение от ${message.user.name}`,
    body: content?.startsWith("e2ee:") ? "Зашифрованное сообщение" : (content || "").slice(0, 100),
    link: "/connect",
  }).catch(() => {});

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
    data: { content: content.startsWith("e2ee:") ? content : sanitizeText(content), edited: true, editedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true, role: true, avatarGlowEnabled: true, avatarGlowColors: true } },
    },
  });

  const conversation = await prisma.directConversation.findUnique({ where: { id } });
  if (conversation) {
    const otherId = conversation.user1Id === session.user.id ? conversation.user2Id : conversation.user1Id;
    const payload = { ...updated, conversationId: id };
    emitToUser(otherId, "dm-edited", payload);
    emitToUser(session.user.id, "dm-edited", payload);
  }

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

  const conversation = await prisma.directConversation.findUnique({ where: { id } });
  if (conversation) {
    const otherId = conversation.user1Id === session.user.id ? conversation.user2Id : conversation.user1Id;
    const payload = { messageId, conversationId: id };
    emitToUser(otherId, "dm-deleted", payload);
    emitToUser(session.user.id, "dm-deleted", payload);
  }

  return NextResponse.json({ ok: true });
}
