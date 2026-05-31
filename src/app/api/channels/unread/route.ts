import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.channelMember.findMany({
    where: { userId: session.user.id },
    select: { channelId: true, lastRead: true },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ unread: {} });
  }

  const unreadCounts: Record<string, number> = {};

  for (const m of memberships) {
    const count = await prisma.message.count({
      where: {
        channelId: m.channelId,
        createdAt: { gt: m.lastRead },
        deleted: false,
        userId: { not: session.user.id },
      },
    });
    if (count > 0) {
      unreadCounts[m.channelId] = count;
    }
  }

  return NextResponse.json({ unread: unreadCounts });
}
