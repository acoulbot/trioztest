import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkBan } from "@/lib/banCheck";
import { rateLimit } from "@/lib/rateLimit";
import { ensureMainCommunity, autoJoinMainCommunity } from "@/lib/mainCommunity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json([]);
  }

  try {
    // Auto-create main community if it doesn't exist yet
    await ensureMainCommunity();
    // Auto-join current user to main community if not already a member
    await autoJoinMainCommunity(session.user.id);

    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      select: {
        sortOrder: true,
        group: {
          include: {
            _count: { select: { members: true, channels: true } },
            owner: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    const groups = memberships
      .map((m) => ({ ...m.group, sortOrder: m.sortOrder }))
      .sort((a, b) => {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return NextResponse.json(groups);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "groups", { limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBan(session.user.id);
  if (banned) return banned;

  const { name, icon, description } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Имя группы слишком длинное (макс. 100 символов)" }, { status: 400 });
  }
  if (description && description.length > 1000) {
    return NextResponse.json({ error: "Описание слишком длинное (макс. 1000 символов)" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      icon: icon || null,
      description: description || "",
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER", rulesAccepted: true },
      },
      channels: {
        create: [
          { name: "общий", type: "TEXT", icon: "💬" },
          { name: "голосовой", type: "VOICE", icon: "🎙️" },
        ],
      },
    },
    include: {
      _count: { select: { members: true, channels: true } },
      channels: true,
    },
  });

  return NextResponse.json(group);
}
