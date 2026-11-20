import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

// Solo añade claves nuevas: nunca imprime ni reemplaza secretos existentes.
const file = resolve(".env");
let current = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (key) => new RegExp(`^${key}=`, "m").test(current);
const value = (key) => current.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.replace(/^['"]|['"]$/g, "");
const existingPassword = value("POSTGRES_PASSWORD");
const password = existingPassword && !existingPassword.startsWith("generar-") ? existingPassword : randomBytes(24).toString("hex");
const defaults = {
  APP_ORIGIN: "http://localhost:3000", NEXT_PUBLIC_APP_NAME: "Restaurante campestre",
  AUTH_SECRET: randomBytes(48).toString("hex"), SESSION_HOURS: "12", NEXT_PORT: "3000",
  POSTGRES_USER: "restaurant", POSTGRES_DB: "restaurant", POSTGRES_PASSWORD: password, POSTGRES_PORT: "55432",
  DATABASE_URL: `postgresql://${value("POSTGRES_USER") || "restaurant"}:${encodeURIComponent(password)}@127.0.0.1:${value("POSTGRES_PORT") || "55432"}/${value("POSTGRES_DB") || "restaurant"}?schema=public`,
  REDIS_CACHE_URL: "redis://127.0.0.1:56379", REDIS_QUEUE_URL: "redis://127.0.0.1:56380", REDIS_CACHE_PORT: "56379", REDIS_QUEUE_PORT: "56380",
  SEED_DEMO: "false", SEED_PASSWORD: randomBytes(18).toString("base64url"),
  BUSINESS_NAME: "", BUSINESS_RUC: "", BUSINESS_ADDRESS: "", CLAIMS_EMAIL: "",
  SMTP_HOST: "", SMTP_PORT: "587", SMTP_USER: "", SMTP_PASSWORD: "", MAIL_FROM: "",
  TICKET_WIDTH_MM: "80", INVOICE_PROVIDER: "disabled"
};
let added = 0;
for (const [key, val] of Object.entries(defaults)) {
  if (!has(key)) { current += `\n${key}=${val}`; added++; }
  else if (value(key)?.startsWith("generar-") || (key === "DATABASE_URL" && value(key)?.includes(":CAMBIAR@"))) {
    current = current.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${val}`); added++;
  }
}
writeFileSync(file, current.trimEnd() + "\n", { mode: 0o600 });
// Next.js carga el archivo raíz mediante next.config.ts; no duplicamos secretos.
mkdirSync(".cache", { recursive: true });
console.log(`Configuración lista: ${added} claves añadidas; valores existentes conservados.`);
