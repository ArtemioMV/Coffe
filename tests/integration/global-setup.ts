import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext { databaseUrl: string }
}

function freePort() {
  return new Promise<number>((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => done(port));
    });
  });
}

export default async function setup(project: TestProject) {
  const databaseDir = mkdtempSync(join(tmpdir(), "restaurant-it-"));
  const port = await freePort();
  const password = "integracion-local";
  const cluster = new EmbeddedPostgres({
    databaseDir, port, user: "postgres", password, persistent: false,
    initdbFlags: ["--encoding=UTF8"], postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {}, onError: () => {}
  });
  await cluster.initialise();
  await cluster.start();
  await cluster.createDatabase("restaurant_it");

  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/restaurant_it?schema=public`;
  // Mismas migraciones versionadas que producción, nunca db push.
  execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", "packages/database/prisma/schema.prisma"], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe", windowsHide: true
  });
  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await cluster.stop();
    rmSync(databaseDir, { recursive: true, force: true });
  };
}
