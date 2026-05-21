import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const backgrounds = await prisma.windowBackground.findMany({
    where: { active: true },
  });

  return NextResponse.json(backgrounds);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { windowId, animationType, customCss, gradientFrom, gradientVia, gradientTo } = await req.json();
  if (!windowId) {
    return NextResponse.json({ error: "windowId required" }, { status: 400 });
  }

  const background = await prisma.windowBackground.upsert({
    where: { windowId },
    update: { animationType, customCss, gradientFrom, gradientVia, gradientTo },
    create: { windowId, animationType, customCss, gradientFrom, gradientVia, gradientTo },
  });

  return NextResponse.json(background);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, animationType, customCss, gradientFrom, gradientVia, gradientTo, active } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const background = await prisma.windowBackground.update({
    where: { id },
    data: { animationType, customCss, gradientFrom, gradientVia, gradientTo, active },
  });

  return NextResponse.json(background);
}
