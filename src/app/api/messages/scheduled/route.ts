import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const msgs = await prisma.scheduledMessage.findMany({
    where: { userId: session.user.id, sent: false },
    orderBy: { scheduledAt: "asc" },
    include: { channel: { select: { id: true, name: true } } },
  });

  return NextResponse.json(msgs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, channelId, scheduledAt } = await req.json();
  if (!content?.trim() || !channelId || !scheduledAt) {
    return NextResponse.json({ error: "content, channelId, scheduledAt required" }, { status: 400 });
  }

  const schedDate = new Date(scheduledAt);
  if (schedDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
  }

  const msg = await prisma.scheduledMessage.create({
    data: { content: content.trim(), channelId, userId: session.user.id, scheduledAt: schedDate },
  });

  return NextResponse.json(msg, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const msg = await prisma.scheduledMessage.findUnique({ where: { id } });
  if (!msg || msg.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scheduledMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
