import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { customStatus, statusEmoji } = await req.json();

  if (customStatus !== undefined && customStatus !== null && customStatus.length > 100) {
    return NextResponse.json({ error: "Статус не должен превышать 100 символов" }, { status: 400 });
  }
  if (statusEmoji !== undefined && statusEmoji !== null && statusEmoji.length > 10) {
    return NextResponse.json({ error: "Некорректный emoji" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (customStatus !== undefined) data.customStatus = customStatus || null;
  if (statusEmoji !== undefined) data.statusEmoji = statusEmoji || null;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { customStatus: true, statusEmoji: true },
  });

  return NextResponse.json(updated);
}
