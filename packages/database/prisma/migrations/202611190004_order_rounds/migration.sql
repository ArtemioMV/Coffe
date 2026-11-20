-- Comandas adicionales dentro del mismo pedido de la mesa (solo columnas nuevas; sin tocar datos existentes).
ALTER TABLE "Order" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "round" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "Order_parentId_idx" ON "Order"("parentId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_round_positive" CHECK ("round" >= 1);
