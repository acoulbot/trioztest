import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const AI_KEYS = ["ai_api_key", "ai_model", "ai_system_prompt", "ai_provider"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configs = await prisma.siteConfig.findMany({
    where: { key: { in: AI_KEYS } },
  });

  const settings: Record<string, string> = {};
  for (const c of configs) {
    settings[c.key] = c.key === "ai_api_key" && c.value
      ? c.value.slice(0, 8) + "..." + c.value.slice(-4)
      : c.value;
  }

  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  for (const key of AI_KEYS) {
    if (body[key] !== undefined) {
      await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value: body[key] },
        update: { value: body[key] },
      });
    }
  }

  return NextResponse.json({ success: true });
}
