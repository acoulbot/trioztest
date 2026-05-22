import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const configs = await prisma.siteConfig.findMany({
    where: { key: { startsWith: "content:" } },
  });

  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key.replace("content:", "")] = c.value;
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key, value } = await req.json();
  if (!key || !value) {
    return NextResponse.json({ error: "Key and value required" }, { status: 400 });
  }

  const dbKey = `content:${key}`;

  await prisma.siteConfig.upsert({
    where: { key: dbKey },
    update: { value },
    create: { key: dbKey, value },
  });

  return NextResponse.json({ ok: true });
}
