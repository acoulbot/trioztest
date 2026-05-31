import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, imageUrl } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Тема и сообщение обязательны" }, { status: 400 });
  }

  const users = await prisma.user.findMany({ select: { id: true } });

  let count = 0;
  for (const user of users) {
    try {
      await createNotification({
        userId: user.id,
        type: "system",
        title,
        body: imageUrl ? `${body}\n[img]${imageUrl}[/img]` : body,
        link: "/settings/notifications",
      });
      count++;
    } catch {
      // skip failed
    }
  }

  return NextResponse.json({ sent: count, total: users.length });
}
