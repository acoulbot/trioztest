import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, name, username, password, verificationCode } = await req.json();

    if (!email || !name || !username || !password) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: "Юзернейм: 3-20 символов, латиница, цифры и _" }, { status: 400 });
    }

    if (verificationCode) {
      const record = await prisma.verificationCode.findFirst({
        where: {
          email,
          code: verificationCode,
          type: "register",
          used: true,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!record) {
        return NextResponse.json({ error: "Код подтверждения недействителен" }, { status: 400 });
      }
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email уже зарегистрирован" }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: "Юзернейм уже занят" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          name,
          username,
          password: hashed,
          emailVerified: !!verificationCode,
        },
      });
    } catch (e: unknown) {
      const isPrismaUniqueError =
        e instanceof Error && "code" in (e as Record<string, unknown>) && (e as Record<string, unknown>).code === "P2002";
      if (isPrismaUniqueError) {
        return NextResponse.json({ error: "Email или юзернейм уже заняты" }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, username: user.username });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
