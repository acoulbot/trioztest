import prisma from "@/lib/prisma";
import { getIO } from "@/lib/socketEmit";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });

  const io = getIO();
  if (io) {
    io.to(`dm-${params.userId}`).emit("new-notification", notification);
  }

  return notification;
}
