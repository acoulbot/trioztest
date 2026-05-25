import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const pattern = `%${query}%`;
  const results: {
    articles?: unknown[];
    messages?: unknown[];
    users?: unknown[];
  } = {};

  if (type === "all" || type === "articles") {
    const articles = await prisma.article.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { tags: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        tags: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    results.articles = articles.map((a) => ({
      ...a,
      snippet: extractSnippet(a.content, query),
      content: undefined,
    }));
  }

  if (type === "all" || type === "messages") {
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      select: { groupId: true },
    });
    const groupIds = userGroups.map((g) => g.groupId);

    const channels = await prisma.channel.findMany({
      where: { groupId: { in: groupIds } },
      select: { id: true },
    });
    const channelIds = channels.map((c) => c.id);

    if (channelIds.length > 0) {
      const messages = await prisma.message.findMany({
        where: {
          channelId: { in: channelIds },
          deleted: false,
          content: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          channelId: true,
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          channel: {
            select: { id: true, name: true, group: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      results.messages = messages.map((m) => ({
        ...m,
        snippet: extractSnippet(m.content, query),
      }));
    } else {
      results.messages = [];
    }
  }

  if (type === "all" || type === "users") {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        avatarGlowEnabled: true,
        avatarGlowColors: true,
      },
      take: limit,
    });
    results.users = users;
  }

  return NextResponse.json(results);
}

function extractSnippet(text: string, query: string, contextChars = 80): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text.slice(0, contextChars * 2);

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}
