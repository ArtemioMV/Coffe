import Redis from "ioredis";
import { HttpError } from "./http";
const local = new Map<string, { count: number; until: number }>();
let client: Redis | undefined;
export async function rateLimit(request: Request, group: string, max = 30) {
  // Nginx sobrescribe X-Real-IP. Acceso directo: bucket común, nunca confiar en X-Forwarded-For del cliente.
  const ip = process.env.TRUST_PROXY === "true" ? request.headers.get("x-real-ip") || "unknown" : "local";
  const key = `${process.env.REDIS_NAMESPACE || "restaurant"}:limit:${group}:${ip}`;
  let count: number;
  if (process.env.REDIS_CACHE_URL) {
    if (!client) {
      client = new Redis(process.env.REDIS_CACHE_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: times => Math.min(times * 500, 10000), connectTimeout: 1000 });
      client.on("error", () => {});
    }
    try {
      const result = await client.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n", 1, key);
      count = Number(result);
    } catch { count = localCount(key); }
  } else count = localCount(key);
  if (count > max) throw new HttpError(429, "Demasiados intentos. Espera un minuto.");
}
function localCount(key: string) {
  const now = Date.now();
  if (local.size > 5000) for (const [entry, value] of local) if (value.until < now) local.delete(entry);
  const slot = local.get(key);
  if (!slot || slot.until < now) { local.set(key, { count: 1, until: now + 60_000 }); return 1; }
  return ++slot.count;
}
