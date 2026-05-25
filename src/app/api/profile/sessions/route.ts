import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.userSession.findMany({
    where: { userId: session.user.id, active: true },
    select: { id: true, userAgent: true, ip: true, lastUsed: true, createdAt: true },
    orderBy: { lastUsed: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    // Terminate specific session
    const target = await prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!target || target.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.userSession.update({ where: { id: sessionId }, data: { active: false } });
  } else {
    // Terminate all other sessions (keep current)
    await prisma.userSession.updateMany({
      where: { userId: session.user.id, active: true },
      data: { active: false },
    });
  }

  return NextResponse.json({ ok: true });
}
