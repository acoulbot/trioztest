import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";

/* GET — list tasks for a channel */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const tasks = await prisma.channelTask.findMany({
    where: { channelId },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

/* POST — create a task */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId, title, description, assigneeId, priority, dueDate } = await req.json();

  if (!channelId || !title) {
    return NextResponse.json({ error: "channelId and title required" }, { status: 400 });
  }

  const task = await prisma.channelTask.create({
    data: {
      channelId,
      creatorId: session.user.id,
      title,
      description,
      assigneeId: assigneeId || null,
      priority: priority || "normal",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Notify assignee
  if (assigneeId && assigneeId !== session.user.id) {
    createNotification({
      userId: assigneeId,
      type: "system",
      title: "Новая задача",
      body: `${session.user.name} назначил вам задачу: ${title}`,
      link: "/connect",
    }).catch(() => {});
  }

  return NextResponse.json(task, { status: 201 });
}

/* PATCH — update a task */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, status, assigneeId, title, description, priority, dueDate } = await req.json();

  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const task = await prisma.channelTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await prisma.channelTask.update({
    where: { id: taskId },
    data,
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Notify if reassigned
  if (assigneeId && assigneeId !== session.user.id && assigneeId !== task.assigneeId) {
    createNotification({
      userId: assigneeId,
      type: "system",
      title: "Задача назначена",
      body: `${session.user.name} назначил вам задачу: ${updated.title}`,
      link: "/connect",
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

/* DELETE — delete a task */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const task = await prisma.channelTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (task.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.channelTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
