import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      avatar: true,
      role: true,
      banned: true,
      banReason: true,
      bannedUntil: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
