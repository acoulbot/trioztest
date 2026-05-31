import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAction } from "@/lib/audit";

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

  const isAdminRole = membership.role === "OWNER" || membership.role === "ADMIN" || membership.role === "MODERATOR";

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      channels: {
        include: {
          _count: { select: { messages: true, members: true } },
          allowedRoles: { select: { roleId: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
          tags: {
            include: { role: { select: { id: true, name: true, color: true } } },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      owner: { select: { id: true, name: true, username: true } },
      roles: {
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "asc" },
      },
      invites: isAdminRole
        ? { orderBy: { createdAt: "desc" } }
        : false,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Filter restricted channels for non-admin members
  let visibleChannels = group.channels;
  if (!isAdminRole) {
    const memberRecord = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: id } },
      include: { tags: { select: { roleId: true } } },
    });
    const userRoleIds = new Set(memberRecord?.tags.map((t) => t.roleId) ?? []);

    visibleChannels = group.channels.filter((ch) => {
      if (!ch.isRestricted) return true;
      if (ch.allowedRoles.length === 0) return true;
      return ch.allowedRoles.some((a) => userRoleIds.has(a.roleId));
    });
  }

  return NextResponse.json({
    ...group,
    channels: visibleChannels,
    myRole: membership.role,
    rulesAccepted: membership.rulesAccepted,
  });
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

  if (!membership || (membership.role !== "OWNER" && membership.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, icon, description, rules } = await req.json();

  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description }),
      ...(rules !== undefined && { rules }),
    },
  });

  await logAction({
    userId: session.user.id,
    username: session.user.username || session.user.name || "user",
    action: "update",
    target: "Group",
    targetId: id,
    details: `Редактирование группы "${group.name}"`,
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
  if (group.isMain) {
    return NextResponse.json({ error: "Cannot delete the main community" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });

  await logAction({
    userId: session.user.id,
    username: session.user.username || session.user.name || "user",
    action: "delete",
    target: "Group",
    targetId: id,
    details: `Удаление группы "${group.name}"`,
  });

  return NextResponse.json({ ok: true });
}
