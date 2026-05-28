import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAction } from "@/lib/audit";

const ROLE_RANK: Record<string, number> = {
  USER: 1,
  CONSULTANT: 2,
  EDITOR: 3,
  ADMIN: 4,
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return NextResponse.json({ error: "Username must be 3-20 characters" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return NextResponse.json({ error: "Username can only contain letters, numbers and underscores" }, { status: 400 });
  }

  const { id } = await params;
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const myRank = ROLE_RANK[session.user.role] || 0;
  const targetRank = ROLE_RANK[targetUser.role] || 0;
  const isSelf = session.user.id === id;

  if (!isSelf && targetRank >= myRank) {
    return NextResponse.json({ error: "Cannot change username of a user with equal or higher rank" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { username: trimmed } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { username: trimmed },
    select: { id: true, username: true, email: true, name: true, role: true },
  });

  await logAction({
    userId: session.user.id,
    username: session.user.username || session.user.name || "admin",
    action: "update",
    target: "User",
    targetId: id,
    details: `Изменение username на "${trimmed}"`,
  });

  return NextResponse.json(updated);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { role, banned, banReason, bannedUntil } = await req.json();

  const { id } = await params;
  const myRank = ROLE_RANK[session.user.role] || 0;
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const targetRank = ROLE_RANK[targetUser.role] || 0;
  const isSelf = session.user.id === id;

  // Cannot modify a user with higher rank (unless self)
  if (!isSelf && targetRank > myRank) {
    return NextResponse.json({ error: "Cannot modify a user with higher rank" }, { status: 403 });
  }

  // Cannot promote someone to a rank higher than your own
  if (role !== undefined && !isSelf) {
    const newRank = ROLE_RANK[role as string] || 0;
    if (newRank > myRank) {
      return NextResponse.json({ error: "Cannot assign a role higher than your own" }, { status: 403 });
    }
  }

  // Prevent admin from banning another admin (already covered by rank check above, kept for clarity)
  if (banned === true && targetUser.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot ban an admin" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (banned !== undefined) data.banned = banned;
  if (banReason !== undefined) data.banReason = banReason;
  if (bannedUntil !== undefined) data.bannedUntil = bannedUntil ? new Date(bannedUntil) : null;

  // When unbanning, clear ban fields
  if (banned === false) {
    data.banReason = null;
    data.bannedUntil = null;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      banReason: true,
      bannedUntil: true,
    },
  });

  const actions: string[] = [];
  if (role !== undefined) actions.push(`роль → ${role}`);
  if (banned === true) actions.push(`бан: ${banReason || "без причины"}`);
  if (banned === false) actions.push("разбан");

  await logAction({
    userId: session.user.id,
    username: session.user.username || session.user.name || "admin",
    action: banned === true ? "ban" : banned === false ? "unban" : "update",
    target: "User",
    targetId: id,
    details: `Пользователь "${targetUser.username}": ${actions.join(", ")}`,
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const myRank = ROLE_RANK[session.user.role] || 0;
  const targetRank = ROLE_RANK[targetUser.role] || 0;
  if (targetRank >= myRank) {
    return NextResponse.json({ error: "Cannot delete a user with equal or higher rank" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });

  await logAction({
    userId: session.user.id,
    username: session.user.username || session.user.name || "admin",
    action: "delete",
    target: "User",
    targetId: id,
    details: `Удаление пользователя "${targetUser.username}"`,
  });

  return NextResponse.json({ success: true });
}
