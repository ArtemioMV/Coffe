import { inject } from "vitest";
import { randomBytes } from "node:crypto";

// Se ejecuta antes de importar los servicios: Prisma toma DATABASE_URL al crear el cliente.
process.env.DATABASE_URL = inject("databaseUrl");
process.env.AUTH_SECRET = randomBytes(48).toString("hex");
process.env.APP_ORIGIN = "http://127.0.0.1:3999";
// Sin Redis: caché y rate limit deben degradar sin romper.
delete process.env.REDIS_CACHE_URL;
delete process.env.REDIS_QUEUE_URL;
