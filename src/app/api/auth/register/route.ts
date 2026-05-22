import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, name, username, password } = await req.json();

    if (!email || !name || !username || !password) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: "Юзернейм: 3-20 символов, латиница, цифры и _" }, { status: 400 });
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
    const user = await prisma.user.create({
      data: { email, name, username, password: hashed },
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, username: user.username });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
