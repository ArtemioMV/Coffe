import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

const connection = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(connection.hostname)) throw new Error("Las pruebas solo pueden crear una base en PostgreSQL local");
const databaseName = `restaurant_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
if (!/^restaurant_test_\d+_[a-f0-9]{8}$/.test(databaseName)) throw new Error("Nombre de base de prueba inválido");
const adminUrl = new URL(connection); adminUrl.pathname = "/postgres";
const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
connection.pathname = `/${databaseName}`;
const env = { ...process.env, DATABASE_URL: connection.toString(), APP_ORIGIN: "http://localhost:3100", REDIS_NAMESPACE: databaseName, RESTAURANT_E2E: "true", SEED_DEMO: "true", SMTP_HOST: "", MAIL_FROM: "" };
const run = (file, args) => new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, [resolve(file), ...args], { env, stdio: "inherit", windowsHide: true });
  child.on("error", reject); child.on("exit", code => code === 0 ? resolveRun() : reject(new Error(`Proceso de prueba terminó con código ${code}`)));
});
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  await run("node_modules/prisma/build/index.js", ["migrate", "deploy", "--schema", "packages/database/prisma/schema.prisma"]);
  await run("node_modules/tsx/dist/cli.mjs", ["packages/database/src/seed.ts"]);
  // La caché de Turbopack de una corrida anterior (otra base y otras variables) provoca recargas en bucle del navegador.
  rmSync(resolve("apps/web/.next-e2e"), { recursive: true, force: true });
  await run("node_modules/@playwright/test/cli.js", ["test", ...process.argv.slice(2)]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  // Solo se elimina la base efímera de nombre generado y validado en este proceso.
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await admin.$disconnect();
}
