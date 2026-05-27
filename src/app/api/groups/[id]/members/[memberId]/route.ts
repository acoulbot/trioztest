import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ROLE_RANK: Record<string, number> = { OWNER: 3, MODERATOR: 2, MEMBER: 1 };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const { role } = await req.json();

  if (!role || !["MODERATOR", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!myMembership || (ROLE_RANK[myMembership.role] ?? 0) < 3) {
    return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
  }

  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!target || target.groupId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 });
  }

  const updated = await prisma.groupMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!target || target.groupId !== id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot kick owner" }, { status: 403 });
  }

  const myRank = ROLE_RANK[myMembership.role] ?? 0;
  const targetRank = ROLE_RANK[target.role] ?? 0;

  if (myRank <= targetRank) {
    return NextResponse.json({ error: "Cannot kick member of equal or higher rank" }, { status: 403 });
  }

  await prisma.groupMember.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
