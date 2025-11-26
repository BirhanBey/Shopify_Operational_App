-- CreateTable
CREATE TABLE "VariantEditorSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sku" TEXT,
    "templateId" TEXT,
    "designId" TEXT,
    "materialId" TEXT,
    "projectName" TEXT,
    "userEmail" TEXT,
    "language" TEXT DEFAULT 'en',
    "sheetsMax" INTEGER,
    "includedPages" INTEGER,
    "locale" TEXT,
    "personalisations" TEXT,
    "f2dArticleCode" TEXT,
    "productUnitCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "VariantEditorSettings_shop_sku_idx" ON "VariantEditorSettings"("shop", "sku");

-- CreateIndex
CREATE INDEX "VariantEditorSettings_variantId_idx" ON "VariantEditorSettings"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantEditorSettings_shop_variantId_key" ON "VariantEditorSettings"("shop", "variantId");
