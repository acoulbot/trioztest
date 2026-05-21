import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { role, banned, banReason } = await req.json();
  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (banned !== undefined) data.banned = banned;
  if (banReason !== undefined) data.banReason = banReason;

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      banReason: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
