import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function checkChannelGroupAdmin(userId: string, channelId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return null;

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: channel.groupId } },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN" && membership.role !== "MODERATOR")) {
    return null;
  }

  return channel;
}

// GET /api/channels/[id]/access — get channel restriction settings
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      allowedRoles: {
        include: { role: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json({
    isRestricted: channel.isRestricted,
    allowedRoles: channel.allowedRoles.map((ar) => ar.role),
  });
}

// PUT /api/channels/[id]/access — toggle restriction and set allowed roles
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await checkChannelGroupAdmin(session.user.id, id);
  if (!channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isRestricted, roleIds } = await req.json();

  // Update channel restriction flag
  if (isRestricted !== undefined) {
    await prisma.channel.update({
      where: { id },
      data: { isRestricted },
    });
  }

  // Replace allowed roles if provided
  if (Array.isArray(roleIds)) {
    await prisma.channelRoleAccess.deleteMany({ where: { channelId: id } });

    if (roleIds.length > 0) {
      await prisma.channelRoleAccess.createMany({
        data: roleIds.map((roleId: string) => ({ channelId: id, roleId })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.channel.findUnique({
    where: { id },
    include: {
      allowedRoles: {
        include: { role: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  return NextResponse.json({
    isRestricted: updated?.isRestricted,
    allowedRoles: updated?.allowedRoles.map((ar) => ar.role) ?? [],
  });
}
