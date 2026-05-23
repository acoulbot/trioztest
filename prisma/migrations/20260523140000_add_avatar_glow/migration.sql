-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarGlowEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "avatarGlowColors" TEXT;
