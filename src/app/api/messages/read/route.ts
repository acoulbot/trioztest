import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageIds } = await req.json();
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds required" }, { status: 400 });
  }

  const ids = messageIds.slice(0, 100);
  await Promise.all(
    ids.map((messageId: string) =>
      prisma.messageRead.upsert({
        where: { userId_messageId: { userId: session.user.id, messageId } },
        update: {},
        create: { userId: session.user.id, messageId },
      }).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true });
}
