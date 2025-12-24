-- CreateTable
CREATE TABLE "logistic_centers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "detail" TEXT,
    "responsable" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "commune_id" INTEGER NOT NULL,
    "shop" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "logistic_centers_external_id_shop_key" ON "logistic_centers"("external_id", "shop");
