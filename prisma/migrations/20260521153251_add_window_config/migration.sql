-- CreateTable
CREATE TABLE "WindowConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "windowKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#ff4444',
    "backgroundUrl" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'gradient',
    "gradientFrom" TEXT NOT NULL DEFAULT '#1a0000',
    "gradientTo" TEXT NOT NULL DEFAULT '#0a0a0f',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WindowConfig_windowKey_key" ON "WindowConfig"("windowKey");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");
