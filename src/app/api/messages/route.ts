import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { checkBan } from "@/lib/banCheck";
import { rateLimit } from "@/lib/rateLimit";
import { emitToChannel } from "@/lib/socketEmit";
import { createNotification } from "@/lib/createNotification";

const MESSAGE_SELECT = {
  user: {
    select: {
      id: true, name: true, username: true, avatar: true,
      role: true, avatarGlowEnabled: true, avatarGlowColors: true,
    },
  },
  reactions: {
    select: { id: true, emoji: true, userId: true, user: { select: { id: true, name: true } } },
  },
  replyTo: {
    select: {
      id: true, content: true, user: { select: { id: true, name: true } },
    },
  },
  reads: {
    select: { userId: true },
  },
  _count: {
    select: { threadReplies: true },
  },
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

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

  const threadId = searchParams.get("threadId");

  const messages = await prisma.message.findMany({
    where: threadId ? { threadId } : { channelId, threadId: null },
    include: MESSAGE_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // Update lastRead for this user/channel
  await prisma.channelMember.upsert({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    update: { lastRead: new Date() },
    create: { userId: session.user.id, channelId, lastRead: new Date() },
  });

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: hasMore ? messages[0]?.id : null,
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "messages", { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { content, channelId, attachments, replyToId, mentions, threadId } = await req.json();
  if ((!content || !content.trim()) && !attachments) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  if (content && content.length > 4000) {
    return NextResponse.json({ error: "Message too long (max 4000 characters)" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { groupId: true, type: true, isRestricted: true, slowmode: true },
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

  const isPrivileged = membership.role === "OWNER" || membership.role === "ADMIN" || membership.role === "MODERATOR";

  // Slowmode check
  if (channel.slowmode > 0 && !isPrivileged) {
    const lastMsg = await prisma.message.findFirst({
      where: { channelId, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastMsg) {
      const elapsed = (Date.now() - new Date(lastMsg.createdAt).getTime()) / 1000;
      if (elapsed < channel.slowmode) {
        const wait = Math.ceil(channel.slowmode - elapsed);
        return NextResponse.json({ error: `Слоумод: подождите ${wait} сек.` }, { status: 429 });
      }
    }
  }

  // NEWS channels: only OWNER/ADMIN/MODERATOR can post
  if (channel.type === "NEWS" && !isPrivileged) {
    return NextResponse.json({ error: "Only admins can post in news channels" }, { status: 403 });
  }

  // Restricted channels (inactive service): only admins can post
  if (channel.isRestricted && !isPrivileged) {
    return NextResponse.json({ error: "This channel is temporarily restricted" }, { status: 403 });
  }

  const sanitizedContent = content ? sanitizeText(content) : "";
  if (!sanitizedContent && !attachments) {
    return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content: sanitizedContent,
      channelId,
      userId: session.user.id,
      attachments: attachments ? JSON.stringify(attachments) : null,
      replyToId: replyToId || null,
      threadId: threadId || null,
      mentions: mentions ? JSON.stringify(mentions) : null,
    },
    include: MESSAGE_SELECT,
  });

  // Update thread parent counter
  if (threadId) {
    await prisma.message.update({
      where: { id: threadId },
      data: { threadCount: { increment: 1 } },
    });
  }

  emitToChannel(channelId, "new-message", message);

  if (mentions && Array.isArray(mentions) && mentions.length > 0) {
    const senderName = message.user?.name || "Пользователь";
    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { groupId: true } });
    for (const mentionedId of mentions) {
      if (mentionedId !== session.user.id) {
        // Check mute settings
        let isMuted = false;
        if (channel?.groupId) {
          const [gm, cm] = await Promise.all([
            prisma.groupMember.findUnique({ where: { userId_groupId: { userId: mentionedId, groupId: channel.groupId } }, select: { muted: true } }),
            prisma.channelMute.findUnique({ where: { userId_channelId: { userId: mentionedId, channelId } }, select: { muted: true } }),
          ]);
          isMuted = cm?.muted === true || (gm?.muted === true && cm?.muted !== false);
        }
        if (!isMuted) {
          createNotification({
            userId: mentionedId,
            type: "mention",
            title: `${senderName} упомянул вас`,
            body: sanitizedContent.slice(0, 100),
            link: "/connect",
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json(message);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { messageId, content } = await req.json();
  if (!messageId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.deleted) {
    return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
  }

  const sanitizedContent = sanitizeText(content);
  const message = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: sanitizedContent,
      edited: true,
      editedAt: new Date(),
    },
    include: MESSAGE_SELECT,
  });

  emitToChannel(existing.channelId, "message-edited", message);

  return NextResponse.json(message);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Only message author or admin can delete
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (existing.userId !== session.user.id && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.message.update({
    where: { id: messageId },
    data: {
      deleted: true,
      content: "",
      attachments: null,
    },
  });

  emitToChannel(existing.channelId, "message-deleted", { id: messageId, channelId: existing.channelId });

  return NextResponse.json({ ok: true, id: message.id });
}
