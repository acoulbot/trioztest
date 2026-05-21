import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const MANAGE_ROLES = ["ADMIN", "EDITOR"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !MANAGE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, icon } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (icon !== undefined) data.icon = icon;

  const channel = await prisma.channel.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(channel);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !MANAGE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.channel.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
