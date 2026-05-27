import prisma from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

const RETENTION_DAYS = 14;
const LARGE_FILE_THRESHOLD = 1 * 1024 * 1024; // 1 MB

interface AttachmentData {
  url?: string;
  size?: number;
}

function parseAttachments(raw: string | null): AttachmentData[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function deleteFileFromDisk(fileUrl: string): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), "public", fileUrl);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function cleanupExpiredFiles(): Promise<{
  messagesProcessed: number;
  filesDeleted: number;
  dmProcessed: number;
  dmFilesDeleted: number;
}> {
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  let filesDeleted = 0;
  let messagesProcessed = 0;
  let dmFilesDeleted = 0;
  let dmProcessed = 0;

  // --- Channel messages (exclude NEWS channels) ---
  const expiredMessages = await prisma.message.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      deleted: false,
      attachments: { not: null },
      channel: {
        type: { not: "NEWS" },
      },
    },
    select: {
      id: true,
      attachments: true,
    },
  });

  for (const msg of expiredMessages) {
    const attachments = parseAttachments(msg.attachments);
    let hasLargeFile = false;

    for (const att of attachments) {
      if (att.size && att.size >= LARGE_FILE_THRESHOLD && att.url) {
        const deleted = await deleteFileFromDisk(att.url);
        if (deleted) filesDeleted++;
        hasLargeFile = true;
      }
    }

    if (hasLargeFile) {
      const remaining = attachments.filter(
        (a) => !a.size || a.size < LARGE_FILE_THRESHOLD
      );

      await prisma.message.update({
        where: { id: msg.id },
        data: {
          attachments: remaining.length > 0 ? JSON.stringify(remaining) : null,
          content: remaining.length === 0 && !msg.attachments
            ? "[Файл удалён автоматически]"
            : undefined,
        },
      });
      messagesProcessed++;
    }
  }

  // --- Direct messages ---
  const expiredDMs = await prisma.directMessage.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      deleted: false,
      attachments: { not: null },
    },
    select: {
      id: true,
      attachments: true,
    },
  });

  for (const dm of expiredDMs) {
    const attachments = parseAttachments(dm.attachments);
    let hasLargeFile = false;

    for (const att of attachments) {
      if (att.size && att.size >= LARGE_FILE_THRESHOLD && att.url) {
        const deleted = await deleteFileFromDisk(att.url);
        if (deleted) dmFilesDeleted++;
        hasLargeFile = true;
      }
    }

    if (hasLargeFile) {
      const remaining = attachments.filter(
        (a) => !a.size || a.size < LARGE_FILE_THRESHOLD
      );

      await prisma.directMessage.update({
        where: { id: dm.id },
        data: {
          attachments: remaining.length > 0 ? JSON.stringify(remaining) : null,
        },
      });
      dmProcessed++;
    }
  }

  return { messagesProcessed, filesDeleted, dmProcessed, dmFilesDeleted };
}
