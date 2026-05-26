import prisma from "@/lib/prisma";

/**
 * Find the main community group.
 */
export async function getMainCommunity() {
  return prisma.group.findFirst({ where: { isMain: true } });
}

/**
 * Auto-join a user to the main community as MEMBER.
 * No-op if already a member or no main community exists.
 */
export async function autoJoinMainCommunity(userId: string) {
  const main = await getMainCommunity();
  if (!main) return;

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: main.id } },
  });
  if (existing) return;

  await prisma.groupMember.create({
    data: { userId, groupId: main.id, role: "MEMBER", rulesAccepted: true },
  });
}

/**
 * Sync services from the admin list into the main community channels.
 *
 * For each active service:
 *  - 1 NEWS channel: "{service.title}" (serviceId linked)
 *  - 2 TEXT channels: "{service.title} — Обсуждение" and "{service.title} — Вопросы"
 *
 * For inactive services:
 *  - All linked channels get isRestricted = true (hidden from regular users)
 *
 * For deleted services (channels with serviceId not matching any existing service):
 *  - Channels are deleted
 */
export async function syncServicesToMainCommunity() {
  const main = await getMainCommunity();
  if (!main) return;

  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  const serviceIds = new Set(services.map((s) => s.id));

  // Get all service-linked channels in the main community
  const existingChannels = await prisma.channel.findMany({
    where: { groupId: main.id, serviceId: { not: null } },
  });

  // Delete channels whose serviceId no longer exists
  const orphanedChannels = existingChannels.filter((ch) => ch.serviceId && !serviceIds.has(ch.serviceId));
  if (orphanedChannels.length > 0) {
    await prisma.channel.deleteMany({
      where: { id: { in: orphanedChannels.map((ch) => ch.id) } },
    });
  }

  // Group existing channels by serviceId
  const channelsByService = new Map<string, typeof existingChannels>();
  for (const ch of existingChannels) {
    if (!ch.serviceId || !serviceIds.has(ch.serviceId)) continue;
    const arr = channelsByService.get(ch.serviceId) ?? [];
    arr.push(ch);
    channelsByService.set(ch.serviceId, arr);
  }

  // For each service, ensure channels exist
  for (const service of services) {
    const existing = channelsByService.get(service.id) ?? [];

    if (existing.length === 0) {
      // Create channels for this service
      await prisma.channel.createMany({
        data: [
          { name: service.title, type: "NEWS", icon: service.icon || "\uD83D\uDCF0", groupId: main.id, serviceId: service.id, isRestricted: !service.active },
          { name: `${service.title} \u2014 \u041E\u0431\u0441\u0443\u0436\u0434\u0435\u043D\u0438\u0435`, type: "TEXT", icon: "\uD83D\uDCAC", groupId: main.id, serviceId: service.id, isRestricted: !service.active },
          { name: `${service.title} \u2014 \u0412\u043E\u043F\u0440\u043E\u0441\u044B`, type: "TEXT", icon: "\u2753", groupId: main.id, serviceId: service.id, isRestricted: !service.active },
        ],
      });
    } else {
      // Update restriction status based on active state
      const shouldRestrict = !service.active;
      const needsUpdate = existing.filter((ch) => ch.isRestricted !== shouldRestrict);
      if (needsUpdate.length > 0) {
        await prisma.channel.updateMany({
          where: { id: { in: needsUpdate.map((ch) => ch.id) } },
          data: { isRestricted: shouldRestrict },
        });
      }
    }
  }
}

/**
 * Set up (or return existing) the main community group.
 * Creates the group with default channels + 4 voice channels.
 * Adds all existing users as members.
 */
export async function setupMainCommunity(ownerId: string, name: string) {
  const existing = await getMainCommunity();
  if (existing) return existing;

  const group = await prisma.group.create({
    data: {
      name,
      isMain: true,
      description: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E TZ Connect",
      ownerId,
      members: {
        create: { userId: ownerId, role: "OWNER", rulesAccepted: true },
      },
      channels: {
        create: [
          { name: "\u041E\u0431\u0449\u0438\u0439", type: "TEXT", icon: "\uD83D\uDCAC" },
          { name: "\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F", type: "NEWS", icon: "\uD83D\uDCE2" },
          { name: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 1", type: "VOICE", icon: "\uD83C\uDF99\uFE0F" },
          { name: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 2", type: "VOICE", icon: "\uD83C\uDF99\uFE0F" },
          { name: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 3", type: "VOICE", icon: "\uD83C\uDF99\uFE0F" },
          { name: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 4", type: "VOICE", icon: "\uD83C\uDF99\uFE0F" },
        ],
      },
    },
    include: { channels: true },
  });

  // Add all existing users as members
  const users = await prisma.user.findMany({
    where: { id: { not: ownerId } },
    select: { id: true },
  });

  if (users.length > 0) {
    await prisma.groupMember.createMany({
      data: users.map((u) => ({
        userId: u.id,
        groupId: group.id,
        role: "MEMBER",
        rulesAccepted: true,
      })),
      skipDuplicates: true,
    });
  }

  // Sync service channels
  await syncServicesToMainCommunity();

  return group;
}
