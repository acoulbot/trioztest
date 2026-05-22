import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code, type } = await req.json();

    if (!email || !code || !type) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Неверный или просроченный код" },
        { status: 400 }
      );
    }

    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    if (type === "register") {
      return NextResponse.json({ ok: true, verified: true });
    }

    if (type === "login") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      return NextResponse.json({
        ok: true,
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        },
      });
    }

    return NextResponse.json({ ok: true, verified: true });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
