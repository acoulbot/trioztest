import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getIO } from "@/lib/socketEmit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatar: true,
      role: true,
      avatarGlowEnabled: true,
      avatarGlowColors: true,
      tosAccepted: true,
      statusType: true,
      customStatus: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role: string }).role;

  // Only ADMINs can update glow settings
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Только администраторы могут настраивать свечение аватара" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.avatarGlowEnabled === "boolean") {
    data.avatarGlowEnabled = body.avatarGlowEnabled;
  }

  if ("avatarGlowColors" in body) {
    if (body.avatarGlowColors === null) {
      data.avatarGlowColors = null;
    } else if (Array.isArray(body.avatarGlowColors)) {
      const colors = body.avatarGlowColors as string[];
      if (colors.length < 2 || colors.length > 6) {
        return NextResponse.json({ error: "Укажите от 2 до 6 цветов" }, { status: 400 });
      }
      const hexRe = /^#[0-9a-fA-F]{6}$/;
      if (!colors.every((c) => hexRe.test(c))) {
        return NextResponse.json({ error: "Цвета должны быть в формате #RRGGBB" }, { status: 400 });
      }
      data.avatarGlowColors = JSON.stringify(colors);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      avatar: true,
      avatarGlowEnabled: true,
      avatarGlowColors: true,
    },
  });

  const io = getIO();
  if (io) io.emit("profile-updated", updated);

  return NextResponse.json(updated);
}
