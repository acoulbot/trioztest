import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const invite = await prisma.invite.findUnique({
    where: { code: params.code },
    include: {
      group: {
        select: { id: true, name: true, icon: true, description: true, _count: { select: { members: true } } },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "Invite limit reached" }, { status: 410 });
  }

  return NextResponse.json({
    code: invite.code,
    group: invite.group,
    expiresAt: invite.expiresAt,
  });
}

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invite = await prisma.invite.findUnique({
    where: { code: params.code },
    include: { group: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "Invite limit reached" }, { status: 410 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: invite.groupId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member", groupId: invite.groupId }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.groupMember.create({
      data: { userId: session.user.id, groupId: invite.groupId },
    }),
    prisma.invite.update({
      where: { code: params.code },
      data: { uses: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ ok: true, groupId: invite.groupId });
}
