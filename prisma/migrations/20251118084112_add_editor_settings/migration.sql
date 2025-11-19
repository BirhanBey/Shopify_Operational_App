-- CreateTable
CREATE TABLE "EditorSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "editorApiKey" TEXT,
    "editorDomain" TEXT,
    "editorCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EditorSettings_shop_key" ON "EditorSettings"("shop");
