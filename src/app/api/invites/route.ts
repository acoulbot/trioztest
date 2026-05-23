import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, maxUses, expiresInHours } = await req.json();

  if (!groupId) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Need ADMIN or OWNER role to create invites" }, { status: 403 });
  }

  // Generate a unique invite code with sufficient entropy (12 chars)
  let code: string;
  let attempts = 0;
  do {
    code = uuidv4().replace(/-/g, "").slice(0, 12);
    const existing = await prisma.invite.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) {
    return NextResponse.json({ error: "Failed to generate unique code, try again" }, { status: 500 });
  }

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600000)
    : null;

  const invite = await prisma.invite.create({
    data: {
      code,
      groupId,
      createdBy: session.user.id,
      maxUses: maxUses || 0,
      expiresAt,
    },
  });

  return NextResponse.json(invite);
}
