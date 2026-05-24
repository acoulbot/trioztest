import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { checkBan } from "@/lib/banCheck";
import { rateLimit } from "@/lib/rateLimit";

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

  // Verify the user is a member of the group that owns this channel
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

  const messages = await prisma.message.findMany({
    where: { channelId },
    include: {
      user: {
        select: {
          id: true, name: true, username: true, avatar: true,
          role: true, avatarGlowEnabled: true, avatarGlowColors: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "messages", { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { content, channelId } = await req.json();
  if (!content || !channelId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
  }

  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long (max 4000 characters)" }, { status: 400 });
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

  const sanitizedContent = sanitizeText(content);
  if (!sanitizedContent) {
    return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content: sanitizedContent,
      channelId,
      userId: session.user.id,
    },
    include: {
      user: {
        select: {
          id: true, name: true, username: true, avatar: true,
          role: true, avatarGlowEnabled: true, avatarGlowColors: true,
        },
      },
    },
  });

  return NextResponse.json(message);
}
