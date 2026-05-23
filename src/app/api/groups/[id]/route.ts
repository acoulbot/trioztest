import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      channels: {
        include: { _count: { select: { messages: true, members: true } } },
        orderBy: { createdAt: "asc" },
      },
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, username: true, avatar: true,
              role: true, lastSeen: true,
              avatarGlowEnabled: true, avatarGlowColors: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      owner: { select: { id: true, name: true, username: true } },
      invites: membership.role === "OWNER" || membership.role === "ADMIN"
        ? { orderBy: { createdAt: "desc" } }
        : false,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({ ...group, myRole: membership.role });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, icon, description } = await req.json();

  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group || group.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
