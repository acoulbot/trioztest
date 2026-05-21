import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const channels = await prisma.channel.findMany({
    include: {
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, type } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const channel = await prisma.channel.create({
    data: { name, type: type || "TEXT" },
  });

  return NextResponse.json(channel);
}
