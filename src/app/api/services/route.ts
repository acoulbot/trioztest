import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, icon, order } = await req.json();
  if (!title || !description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: { title, description, icon, order: order || 0 },
  });

  return NextResponse.json(service);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, title, description, icon, order, active } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: { title, description, icon, order, active },
  });

  return NextResponse.json(service);
}
