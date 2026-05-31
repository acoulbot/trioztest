import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getIO } from "@/lib/socketEmit";

async function checkChannelAdmin(userId: string, channelId: string) {
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      allowedRoles: { select: { roleId: true } },
    },
  });
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...channel,
    roleIds: channel.allowedRoles.map((ar) => ar.roleId),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await checkChannelAdmin(session.user.id, id);
  if (!channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, icon, type, isRestricted, roleIds, parentId, slowmode } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (icon !== undefined) data.icon = icon;
  if (type !== undefined && ["TEXT", "VOICE", "NEWS"].includes(type)) data.type = type;
  if (isRestricted !== undefined) data.isRestricted = isRestricted;
  if (parentId !== undefined) data.parentId = parentId || null;
  if (slowmode !== undefined) data.slowmode = Math.max(0, Math.min(Number(slowmode) || 0, 3600));

  const updated = await prisma.channel.update({
    where: { id },
    data,
  });

  if (Array.isArray(roleIds)) {
    await prisma.channelRoleAccess.deleteMany({ where: { channelId: id } });
    if (roleIds.length > 0) {
      await prisma.channelRoleAccess.createMany({
        data: roleIds.map((roleId: string) => ({ channelId: id, roleId })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await checkChannelAdmin(session.user.id, id);
  if (!channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.channel.delete({ where: { id } });

  const io = getIO();
  if (io) {
    io.emit("channel-deleted", { channelId: id, groupId: channel.groupId });
  }

  return NextResponse.json({ success: true });
}
