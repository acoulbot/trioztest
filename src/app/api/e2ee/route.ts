import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/e2ee?userId=xxx — get a user's public key
 * GET /api/e2ee (no params) — get own public key
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, e2eePublicKey: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ userId: user.id, username: user.username, publicKey: user.e2eePublicKey });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { e2eePublicKey: true },
  });

  return NextResponse.json({ publicKey: user?.e2eePublicKey || null });
}

/**
 * POST /api/e2ee — register/update own public key
 * Body: { publicKey: string (base64, 44 chars) }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { publicKey } = await req.json();
  if (!publicKey || typeof publicKey !== "string" || publicKey.length > 64) {
    return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { e2eePublicKey: publicKey },
  });

  return NextResponse.json({ ok: true });
}
