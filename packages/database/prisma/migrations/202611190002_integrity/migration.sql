-- Restricciones del negocio que Prisma 6 no representa en su DSL.
CREATE UNIQUE INDEX "Attention_one_open_per_table" ON "Attention" ("tableId") WHERE "closedAt" IS NULL;
ALTER TABLE "DiningTable" ADD CONSTRAINT "table_positive_seats" CHECK ("seats" > 0);
ALTER TABLE "Product" ADD CONSTRAINT "product_nonnegative_price" CHECK ("price" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "order_nonnegative_total" CHECK ("total" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "item_positive_quantity" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "item_nonnegative_price" CHECK ("price" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_positive_amount" CHECK ("amount" > 0);
ALTER TABLE "Ingredient" ADD CONSTRAINT "ingredient_nonnegative_stock" CHECK ("stock" >= 0 AND "minimum" >= 0);
ALTER TABLE "RecipeItem" ADD CONSTRAINT "recipe_positive_quantity" CHECK ("quantity" > 0);
ALTER TABLE "Rating" ADD CONSTRAINT "rating_range" CHECK ("score" BETWEEN 1 AND 5);
ALTER TABLE "User" ADD CONSTRAINT "user_nonnegative_points" CHECK ("points" >= 0);
