import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { channelId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
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

  const { content, channelId } = await req.json();
  if (!content || !channelId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content,
      channelId,
      userId: session.user.id,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(message);
}
