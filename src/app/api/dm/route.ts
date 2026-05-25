import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkBan } from "@/lib/banCheck";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, name: true, username: true, avatar: true, role: true, lastSeen: true, customStatus: true, statusEmoji: true, avatarGlowEnabled: true, avatarGlowColors: true, e2eePublicKey: true } },
      user2: { select: { id: true, name: true, username: true, avatar: true, role: true, lastSeen: true, customStatus: true, statusEmoji: true, avatarGlowEnabled: true, avatarGlowColors: true, e2eePublicKey: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, userId: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const result = conversations.map((c) => {
    const other = c.user1Id === userId ? c.user2 : c.user1;
    const lastMessage = c.messages[0] || null;
    return { id: c.id, other, lastMessage, lastMessageAt: c.lastMessageAt };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: "Нельзя написать себе" }, { status: 400 });

  // Check friendship
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: session.user.id, receiverId: target.id },
        { senderId: target.id, receiverId: session.user.id },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: "Можно писать только друзьям" }, { status: 403 });

  // Find or create conversation
  const [u1, u2] = [session.user.id, target.id].sort();
  let conversation = await prisma.directConversation.findUnique({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
  });

  if (!conversation) {
    conversation = await prisma.directConversation.create({
      data: { user1Id: u1, user2Id: u2 },
    });
  }

  return NextResponse.json({ id: conversation.id, targetUser: target.id });
}
