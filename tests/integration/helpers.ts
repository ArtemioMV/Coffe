import { randomBytes, randomUUID } from "node:crypto";
import { db, Prisma, Role } from "@restaurant/database";
import { HttpError } from "@/lib/http";

const unique = () => randomBytes(5).toString("hex");
export const key = () => `it_${randomUUID().replaceAll("-", "")}`;

export async function user(role: Role) {
  const u = await db.user.create({ data: { name: `QA ${role}`, email: `${role.toLowerCase()}-${unique()}@it.test`, passwordHash: "x", role } });
  return { id: u.id, role: u.role };
}

export async function product(price = "18.50", recipe: { ingredientId: string; quantity: string }[] = []) {
  const category = await db.category.create({ data: { name: `Cat ${unique()}` } });
  return db.product.create({ data: { name: `Plato ${unique()}`, price, categoryId: category.id, recipe: { create: recipe } } });
}

export async function ingredient(stock: string) {
  return db.ingredient.create({ data: { name: `Insumo ${unique()}`, unit: "kg", stock } });
}

/** Mesa con atención abierta por el mesero indicado. */
export async function openTable(waiterId: string) {
  const table = await db.diningTable.create({ data: { name: `M-${unique()}`, zone: "Pruebas", qrToken: randomBytes(24).toString("base64url") } });
  await db.attention.create({ data: { tableId: table.id, waiterId } });
  return table;
}

export function orderBody(qrToken: string, items: { id: string; price: Prisma.Decimal }[], quantity = 1) {
  return { tableToken: qrToken, items: items.map(p => ({ productId: p.id, quantity, expectedPrice: p.price.toFixed(2) })) };
}

/** Estado HTTP que vería el cliente (misma traducción que failure() en lib/http). */
export function statusOf(error: unknown) {
  if (error instanceof HttpError) return error.status;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") return 409;
    if (error.code === "P2025") return 404;
  }
  return 500;
}

export async function expectStatus(promise: Promise<unknown>, status: number) {
  try { await promise; } catch (error) {
    if (statusOf(error) === status) return;
    throw error;
  }
  throw new Error(`Se esperaba un error ${status} y la operación tuvo éxito`);
}
