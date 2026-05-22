import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await prisma.aiChat.findMany({
    where: { userId: session.user.id },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(chats);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId, message } = await req.json();

  let chat;
  if (chatId) {
    chat = await prisma.aiChat.findFirst({
      where: { id: chatId, userId: session.user.id },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
  } else {
    chat = await prisma.aiChat.create({
      data: { userId: session.user.id, title: message.slice(0, 50) || "Новый диалог" },
    });
  }

  await prisma.aiMessage.create({
    data: { chatId: chat.id, role: "user", content: message },
  });

  // Try to call AI API if configured
  const apiKeyConfig = await prisma.siteConfig.findUnique({ where: { key: "ai_api_key" } });
  const modelConfig = await prisma.siteConfig.findUnique({ where: { key: "ai_model" } });
  const promptConfig = await prisma.siteConfig.findUnique({ where: { key: "ai_system_prompt" } });
  const providerConfig = await prisma.siteConfig.findUnique({ where: { key: "ai_provider" } });

  let aiResponse = "ИИ-ассистент пока не подключён. Администратор может настроить API в панели управления.";

  if (apiKeyConfig?.value) {
    try {
      const allMessages = await prisma.aiMessage.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: "asc" },
      });

      const apiMessages = [
        { role: "system", content: promptConfig?.value || "Ты — ИИ-ассистент экосистемы TrioZ. Отвечай на русском языке." },
        ...allMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const provider = providerConfig?.value || "openai";
      let apiUrl = "https://api.openai.com/v1/chat/completions";
      if (provider === "anthropic") {
        apiUrl = "https://api.anthropic.com/v1/messages";
      }

      if (provider === "anthropic") {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKeyConfig.value,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelConfig?.value || "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: promptConfig?.value || "Ты — ИИ-ассистент экосистемы TrioZ. Отвечай на русском языке.",
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        if (data.content?.[0]?.text) {
          aiResponse = data.content[0].text;
        }
      } else {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKeyConfig.value}`,
          },
          body: JSON.stringify({
            model: modelConfig?.value || "gpt-4o-mini",
            messages: apiMessages,
            max_tokens: 1024,
          }),
        });
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
          aiResponse = data.choices[0].message.content;
        }
      }
    } catch {
      aiResponse = "Ошибка при обращении к ИИ API. Проверьте настройки.";
    }
  }

  await prisma.aiMessage.create({
    data: { chatId: chat.id, role: "assistant", content: aiResponse },
  });

  await prisma.aiChat.update({
    where: { id: chat.id },
    data: { updatedAt: new Date() },
  });

  const updatedChat = await prisma.aiChat.findUnique({
    where: { id: chat.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(updatedChat);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  await prisma.aiChat.deleteMany({
    where: { id: chatId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
