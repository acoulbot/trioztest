import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCode, sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "send-code", { limit: 5, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  try {
    const { email, type } = await req.json();

    if (!email || !type) {
      return NextResponse.json({ error: "Email и тип обязательны" }, { status: 400 });
    }

    if (type !== "register" && type !== "login" && type !== "reset") {
      return NextResponse.json({ error: "Неверный тип" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (type === "login" && !existingUser) {
      return NextResponse.json({ ok: true, message: "Если аккаунт существует, код отправлен на " + email });
    }

    if (type === "register" && existingUser) {
      return NextResponse.json({ ok: true, message: "Если аккаунт существует, код отправлен на " + email });
    }

    if (type === "reset" && !existingUser) {
      return NextResponse.json({ ok: true, message: "Если аккаунт существует, код отправлен на " + email });
    }

    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentCode) {
      return NextResponse.json(
        { error: "Подождите минуту перед повторной отправкой" },
        { status: 429 }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: { email, code, type, expiresAt },
    });

    const sent = await sendVerificationEmail(email, code, type);

    if (!sent) {
      return NextResponse.json(
        { error: "Не удалось отправить письмо. Проверьте настройки SMTP." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Код отправлен на " + email });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
