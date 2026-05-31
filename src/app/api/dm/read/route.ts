import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { emitToUser } from "@/lib/socketEmit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });

  const conv = await prisma.directConversation.findUnique({ where: { id: conversationId } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.user1Id !== userId && conv.user2Id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const col = conv.user1Id === userId ? "user1ReadAt" : "user2ReadAt";
  await prisma.$executeRawUnsafe(
    `UPDATE "DirectConversation" SET "${col}" = $1 WHERE "id" = $2`,
    now, conversationId
  );

  const peerId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
  emitToUser(peerId, "dm-read", { conversationId, userId, readAt: now.toISOString() });

  return NextResponse.json({ ok: true });
}
