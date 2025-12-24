-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopify_order_id" TEXT NOT NULL,
    "order_name" TEXT,
    "shop" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request_data" TEXT,
    "response_data" TEXT,
    "error_message" TEXT,
    "http_status" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "audit_logs_shopify_order_id_idx" ON "audit_logs"("shopify_order_id");

-- CreateIndex
CREATE INDEX "audit_logs_shop_idx" ON "audit_logs"("shop");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
