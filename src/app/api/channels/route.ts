import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json([]);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const channels = await prisma.channel.findMany({
    where: { groupId },
    include: {
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, type, groupId } = await req.json();
  if (!name || !groupId) {
    return NextResponse.json({ error: "Name and groupId required" }, { status: 400 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const channel = await prisma.channel.create({
    data: { name, type: type || "TEXT", groupId },
  });

  return NextResponse.json(channel);
}
