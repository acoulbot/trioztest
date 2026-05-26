import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMainCommunity, setupMainCommunity, syncServicesToMainCommunity } from "@/lib/mainCommunity";

// GET — return the main community info
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const main = await getMainCommunity();
  return NextResponse.json(main || { exists: false });
}

// POST — set up the main community (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  const communityName = name?.trim() || "TZ Connect";

  const group = await setupMainCommunity(session.user.id, communityName);
  return NextResponse.json(group);
}

// PUT — trigger service sync for the main community (admin only)
export async function PUT() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await syncServicesToMainCommunity();
  return NextResponse.json({ success: true });
}
