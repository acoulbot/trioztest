import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, username: true, email: true,
      avatar: true, role: true, emailVerified: true,
      bio: true, socialLinks: true, customStatus: true, statusEmoji: true,
      privacyOnline: true, privacyFriends: true, privacyEmail: true,
      notifySound: true, notifyPush: true,
      createdAt: true, lastSeen: true,
      _count: {
        select: {
          messages: true,
          friendsSent: true,
          friendsReceived: true,
          gamePlayers: true,
        },
      },
      badges: {
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, username, email, currentPassword, newPassword, bio, socialLinks } = body;
  const data: Record<string, unknown> = {};

  // Name
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50)
      return NextResponse.json({ error: "Имя должно быть от 2 до 50 символов" }, { status: 400 });
    data.name = name.trim();
  }

  // Username
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
      return NextResponse.json({ error: "Юзернейм: 3–20 символов, только буквы, цифры и _" }, { status: 400 });
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== session.user.id)
      return NextResponse.json({ error: "Юзернейм уже занят" }, { status: 409 });
    data.username = username;
  }

  // Email
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== session.user.id)
      return NextResponse.json({ error: "Email уже используется" }, { status: 409 });
    data.email = email;
    data.emailVerified = false; // require re-verification
  }

  // Bio
  if (bio !== undefined) {
    if (bio !== null && typeof bio === "string" && bio.length > 200) {
      return NextResponse.json({ error: "Био не должно превышать 200 символов" }, { status: 400 });
    }
    data.bio = bio || null;
  }

  // Social links
  if (socialLinks !== undefined) {
    if (socialLinks !== null && typeof socialLinks === "object") {
      data.socialLinks = JSON.stringify(socialLinks);
    } else {
      data.socialLinks = null;
    }
  }

  // Password change
  if (newPassword !== undefined) {
    if (!currentPassword)
      return NextResponse.json({ error: "Введите текущий пароль" }, { status: 400 });
    if (newPassword.length < 8)
      return NextResponse.json({ error: "Новый пароль — минимум 8 символов" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const valid = await bcrypt.compare(currentPassword, user!.password);
    if (!valid)
      return NextResponse.json({ error: "Текущий пароль неверный" }, { status: 400 });

    data.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, username: true, email: true, avatar: true, role: true },
  });

  return NextResponse.json(updated);
}
