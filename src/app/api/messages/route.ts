import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

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

  const messages = await prisma.message.findMany({
    where: { channelId },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is banned
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.banned) {
    const now = new Date();
    if (!user.bannedUntil || new Date(user.bannedUntil) > now) {
      const until = user.bannedUntil
        ? new Date(user.bannedUntil).toLocaleString("ru-RU")
        : "бессрочно";
      return NextResponse.json(
        { error: `Ваш аккаунт ограничен до ${until}. Причина: ${user.banReason || "не указана"}` },
        { status: 403 }
      );
    }
  }

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
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  });

  return NextResponse.json(message);
}
