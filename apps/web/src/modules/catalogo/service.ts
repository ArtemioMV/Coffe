import { db } from "@restaurant/database";
import Redis from "ioredis";
let redis: Redis | undefined;
function cache() {
  if (!process.env.REDIS_CACHE_URL) return undefined;
  if (!redis) {
    redis = new Redis(process.env.REDIS_CACHE_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 1000, retryStrategy: times => Math.min(times * 500, 10000) });
    redis.on("error", () => {});
  }
  return redis;
}
export async function menu() {
  const key = `${process.env.REDIS_NAMESPACE || "restaurant"}:menu:v1`;
  try { const cached = await cache()?.get(key); if (cached) return JSON.parse(cached); } catch { /* La base es la fuente de verdad. */ }
  const categories = await db.category.findMany({ where: { active: true }, orderBy: { position: "asc" }, include: { products: { where: { active: true }, orderBy: { name: "asc" } } } });
  const result = categories.map(c => ({ id: c.id, name: c.name, products: c.products.map(p => ({ id: p.id, name: p.name, description: p.description, price: p.price.toFixed(2), available: p.available, station: p.station })) }));
  try { await cache()?.set(key, JSON.stringify(result), "EX", 60); } catch { /* Caché opcional. */ }
  return result;
}
export async function invalidateMenu() { try { await cache()?.del(`${process.env.REDIS_NAMESPACE || "restaurant"}:menu:v1`); } catch { /* TTL limita antigüedad. */ } }
