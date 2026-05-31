import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/* GET — list polls for a channel */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const polls = await prisma.poll.findMany({
    where: { channelId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      options: {
        include: {
          votes: { select: { userId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(polls);
}

/* POST — create a poll */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId, question, options, anonymous, multiple } = await req.json();

  if (!channelId || !question || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "channelId, question, and at least 2 options required" }, { status: 400 });
  }

  const poll = await prisma.poll.create({
    data: {
      channelId,
      userId: session.user.id,
      question,
      anonymous: !!anonymous,
      multiple: !!multiple,
      options: {
        create: options.map((text: string) => ({ text })),
      },
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      options: { include: { votes: { select: { userId: true } } } },
    },
  });

  return NextResponse.json(poll, { status: 201 });
}

/* PATCH — vote or close a poll */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pollId, optionId, action } = await req.json();

  if (action === "close") {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (poll.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.poll.update({ where: { id: pollId }, data: { closed: true } });
    return NextResponse.json({ ok: true });
  }

  if (!optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });

  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    include: { poll: true },
  });
  if (!option || option.poll.closed) {
    return NextResponse.json({ error: "Poll closed or not found" }, { status: 400 });
  }

  // If not multiple-choice, remove previous votes on this poll
  if (!option.poll.multiple) {
    const existingOptions = await prisma.pollOption.findMany({
      where: { pollId: option.pollId },
      select: { id: true },
    });
    await prisma.pollVote.deleteMany({
      where: {
        userId: session.user.id,
        optionId: { in: existingOptions.map((o) => o.id) },
      },
    });
  }

  // Toggle vote
  const existing = await prisma.pollVote.findUnique({
    where: { optionId_userId: { optionId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.pollVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.pollVote.create({
      data: { optionId, userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
