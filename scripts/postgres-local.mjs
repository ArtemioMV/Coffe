import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseDir = resolve(".cache/postgres");
if (process.env.NODE_ENV === "production") throw new Error("Herramienta exclusiva de desarrollo");
const cluster = new EmbeddedPostgres({ databaseDir, user: process.env.POSTGRES_USER || "restaurant", password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT || 55432), persistent: true, authMethod: "scram-sha-256",
  createPostgresUser: false, autoRehydrateSymlinks: true, postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  initdbFlags: ["--encoding=UTF8"], onLog: () => {}, onError: message => { if (String(message).includes("FATAL")) console.error("postgres_fatal"); }
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await cluster.initialise();
await cluster.start();
const client = cluster.getPgClient("postgres", "127.0.0.1");
await client.connect();
const database = process.env.POSTGRES_DB || "restaurant";
const existing = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [database]);
await client.end();
if (!existing.rowCount) await cluster.createDatabase(database);
console.log("PostgreSQL de desarrollo listo en 127.0.0.1; datos persistidos en .cache/postgres. Ctrl+C para detener sin borrar.");
const hold = setInterval(() => {}, 10000);
async function stop() { clearInterval(hold); await cluster.stop(); process.exit(0); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
