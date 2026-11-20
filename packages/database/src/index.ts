import { PrismaClient } from "@prisma/client";

const shared = globalThis as unknown as { restaurantDb?: PrismaClient };
export const db = shared.restaurantDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") shared.restaurantDb = db;
export { Prisma, Role, OrderStatus, Station } from "@prisma/client";
