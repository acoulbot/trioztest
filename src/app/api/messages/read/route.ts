import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getIO } from "@/lib/socketEmit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageIds, channelId } = await req.json();
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds required" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const ids = messageIds.slice(0, 100);
  await Promise.all(
    ids.map((messageId: string) =>
      prisma.messageRead.upsert({
        where: { userId_messageId: { userId, messageId } },
        update: {},
        create: { userId, messageId },
      }).catch(() => {})
    )
  );

  const io = getIO();
  if (io && channelId) {
    io.to(`channel-${channelId}`).emit("messages-read", { userId, messageIds: ids });
  }

  return NextResponse.json({ ok: true });
}
